import { useEffect, useState } from 'react'
import { Settings as SettingsIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/layout/PageHeader'
import { useScraperHealth } from '@/hooks/useScraperHealth'
import {
  AccountSection,
  ScraperSection,
  StripeSection,
  BlockedTermsSection,
} from '@/components/settings'

export function Settings(): JSX.Element {
  const [user, setUser] = useState<{ email?: string; id?: string } | null>(null)
  const scraperHealth = useScraperHealth()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        icon={SettingsIcon}
        title="Settings"
        description="Manage your account and integrations"
      />

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-2xl space-y-6">
          <AccountSection userEmail={user?.email} userId={user?.id} />

          <div className="card p-6">
            <h2 className="text-sm font-display font-semibold text-gray-900 mb-4">Integrations</h2>
            <div className="space-y-4">
              <StripeSection />
              <ScraperSection
                isLoading={scraperHealth.isLoading}
                isOnline={scraperHealth.data?.ok ?? false}
                latencyMs={scraperHealth.data?.latencyMs ?? 0}
              />
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-sm font-display font-semibold text-gray-900 mb-4">
              Data Management
            </h2>
            <a
              href="/excluded"
              className="flex items-center justify-between rounded-lg border border-gray-200 p-4 hover:bg-gray-50 transition-all"
            >
              <div>
                <div className="text-sm font-medium text-gray-900">Exclude List</div>
                <div className="text-xs text-gray-400">Manage artists who opted out of contact</div>
              </div>
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </a>
          </div>

          <BlockedTermsSection />
        </div>
      </div>
    </div>
  )
}
