import { supabase } from '@/lib/supabase'
import { env } from '@/lib/env'
import { useEffect, useState, useCallback } from 'react'
import { Settings as SettingsIcon } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { useBlockedTerms, useAddBlockedTerm, useDeleteBlockedTerm } from '@/hooks/useBlockedTerms'
import { Select, Input, Button } from '@/components/ui'

const BLOCKED_TERM_TYPE_OPTIONS = [
  { value: 'email_domain', label: 'Email Domain' },
  { value: 'profile_name', label: 'Profile Name' },
]

type GmailStatus = { connected: false } | { connected: true; email: string }

export function Settings() {
  const [user, setUser] = useState<{ email?: string; id?: string } | null>(null)
  const { data: blockedTerms, isLoading: termsLoading, error: termsError } = useBlockedTerms()
  const addTerm = useAddBlockedTerm()
  const deleteTerm = useDeleteBlockedTerm()
  const [newTerm, setNewTerm] = useState('')
  const [newTermType, setNewTermType] = useState<'email_domain' | 'profile_name'>('email_domain')
  const [gmailStatus, setGmailStatus] = useState<GmailStatus>({ connected: false })
  const [gmailLoading, setGmailLoading] = useState(true)

  const checkGmailStatus = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch(`${env.VITE_SUPABASE_URL}/functions/v1/gmail-auth/status`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: env.VITE_SUPABASE_ANON_KEY,
        },
      })
      if (res.ok) {
        const data = await res.json()
        setGmailStatus(data.connected ? { connected: true, email: data.email } : { connected: false })
      }
    } catch { /* ignore */ }
    setGmailLoading(false)
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    checkGmailStatus()
  }, [checkGmailStatus])

  async function connectGmail(): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const res = await fetch(`${env.VITE_SUPABASE_URL}/functions/v1/gmail-auth/auth-url`, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: env.VITE_SUPABASE_ANON_KEY,
      },
    })
    if (!res.ok) return
    const { authUrl } = await res.json()

    // Open OAuth popup
    const popup = window.open(authUrl, 'gmail-auth', 'width=600,height=700')
    // Listen for the OAuth redirect to send the code back
    const interval = setInterval(() => {
      try {
        if (!popup || popup.closed) {
          clearInterval(interval)
          checkGmailStatus()
          return
        }
        const popupUrl = popup.location.href
        if (popupUrl.includes('code=')) {
          const url = new URL(popupUrl)
          const code = url.searchParams.get('code')
          popup.close()
          clearInterval(interval)
          if (code) exchangeGmailCode(code)
        }
      } catch {
        // Cross-origin — popup hasn't redirected back yet
      }
    }, 500)
  }

  async function exchangeGmailCode(code: string): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await fetch(`${env.VITE_SUPABASE_URL}/functions/v1/gmail-auth/callback`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: env.VITE_SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    })
    checkGmailStatus()
  }

  async function disconnectGmail(): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await fetch(`${env.VITE_SUPABASE_URL}/functions/v1/gmail-auth/disconnect`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: env.VITE_SUPABASE_ANON_KEY,
      },
    })
    setGmailStatus({ connected: false })
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        icon={SettingsIcon}
        title="Settings"
        description="Manage your account and integrations"
      />

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-2xl space-y-6">
        {/* Account */}
        <div className="card p-6">
          <h2 className="text-sm font-display font-semibold text-gray-900 mb-4">Account</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Email</span>
              <span className="font-medium text-gray-900">{user?.email ?? '-'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">User ID</span>
              <span className="font-mono text-xs text-gray-400">{user?.id ?? '-'}</span>
            </div>
          </div>
        </div>

        {/* Integrations */}
        <div className="card p-6">
          <h2 className="text-sm font-display font-semibold text-gray-900 mb-4">Integrations</h2>
          <div className="space-y-4">
            {/* Stripe */}
            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
                  <svg className="h-5 w-5 text-purple-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">Stripe</div>
                  <div className="text-xs text-gray-400">Send invoices and accept payments</div>
                </div>
              </div>
              <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-600 ring-1 ring-inset ring-amber-600/20">
                Setup Required
              </span>
            </div>

            {/* Gmail */}
            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
                  <svg className="h-5 w-5 text-red-600" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 010 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">Gmail</div>
                  <div className="text-xs text-gray-400">
                    {gmailStatus.connected
                      ? `Connected as ${gmailStatus.email}`
                      : 'Send outreach emails from your Gmail'}
                  </div>
                </div>
              </div>
              {gmailLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-teal-500" />
              ) : gmailStatus.connected ? (
                <button
                  onClick={disconnectGmail}
                  className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-600 ring-1 ring-inset ring-emerald-600/20 hover:bg-red-50 hover:text-red-600 hover:ring-red-600/20 transition-all"
                >
                  Connected
                </button>
              ) : (
                <button
                  onClick={connectGmail}
                  className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-600 ring-1 ring-inset ring-amber-600/20 hover:bg-amber-100 transition-all cursor-pointer"
                >
                  Connect
                </button>
              )}
            </div>

          </div>
        </div>

        {/* Exclude List link */}
        <div className="card p-6">
          <h2 className="text-sm font-display font-semibold text-gray-900 mb-4">Data Management</h2>
          <a
            href="/excluded"
            className="flex items-center justify-between rounded-lg border border-gray-200 p-4 hover:bg-gray-50 transition-all"
          >
            <div>
              <div className="text-sm font-medium text-gray-900">Exclude List</div>
              <div className="text-xs text-gray-400">Manage artists who opted out of contact</div>
            </div>
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </a>
        </div>

        {/* Blocked Terms */}
        <div className="card p-6">
          {termsError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-center">
              <p className="text-xs font-medium text-red-600">Failed to load blocked terms</p>
            </div>
          )}
          {termsLoading && (
            <div className="mb-4 flex items-center gap-2 text-xs text-gray-400">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-teal-500" />
              Loading blocked terms...
            </div>
          )}
          <h2 className="text-sm font-display font-semibold text-gray-900 mb-1">Blocked Terms</h2>
          <p className="text-xs text-gray-400 mb-4">Filter out unwanted results from discovery and scraping</p>

          {/* Add form */}
          <form
            className="flex items-center gap-2 mb-5"
            onSubmit={(e) => {
              e.preventDefault()
              if (!newTerm.trim()) return
              addTerm.mutate(
                { term: newTerm, type: newTermType },
                { onSuccess: () => setNewTerm('') }
              )
            }}
          >
            <Input
              type="text"
              value={newTerm}
              onChange={(e) => setNewTerm(e.target.value)}
              placeholder="e.g. spam.com or badprofile"
              className="flex-1"
              fullWidth={false}
            />
            <Select
              value={newTermType}
              onChange={(v) => setNewTermType(v as 'email_domain' | 'profile_name')}
              options={BLOCKED_TERM_TYPE_OPTIONS}
            />
            <Button type="submit" variant="primary" disabled={addTerm.isPending || !newTerm.trim()}>
              {addTerm.isPending ? 'Adding...' : 'Add'}
            </Button>
          </form>

          {/* Email Domains */}
          <div className="mb-4">
            <h3 className="text-xs font-medium text-gray-700 mb-2">Email Domains</h3>
            {blockedTerms?.filter((t) => t.type === 'email_domain').length ? (
              <div className="flex flex-wrap gap-2">
                {blockedTerms
                  .filter((t) => t.type === 'email_domain')
                  .map((t) => (
                    <span
                      key={t.id}
                      className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 ring-1 ring-inset ring-red-600/20"
                    >
                      {t.term}
                      <button
                        onClick={() => deleteTerm.mutate(t.id)}
                        className="ml-0.5 text-red-500 hover:text-red-300"
                        aria-label={`Remove ${t.term}`}
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400">No blocked terms yet</p>
            )}
          </div>

          {/* Profile Names */}
          <div>
            <h3 className="text-xs font-medium text-gray-700 mb-2">Profile Names</h3>
            {blockedTerms?.filter((t) => t.type === 'profile_name').length ? (
              <div className="flex flex-wrap gap-2">
                {blockedTerms
                  .filter((t) => t.type === 'profile_name')
                  .map((t) => (
                    <span
                      key={t.id}
                      className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-600 ring-1 ring-inset ring-orange-600/20"
                    >
                      {t.term}
                      <button
                        onClick={() => deleteTerm.mutate(t.id)}
                        className="ml-0.5 text-orange-500 hover:text-orange-300"
                        aria-label={`Remove ${t.term}`}
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400">No blocked terms yet</p>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}
