import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { env } from '@/lib/env'
import { Layout } from '@/components/layout/Layout'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Dashboard } from '@/pages/Dashboard'
import { Pipeline } from '@/pages/Pipeline'
import { Campaigns } from '@/pages/Campaigns'
import { Artists } from '@/pages/Artists'
import { Outreach } from '@/pages/Outreach'
import { Curators } from '@/pages/Curators'
import { Financials } from '@/pages/Financials'
import { Settings } from '@/pages/Settings'
import { ExcludeList } from '@/pages/ExcludeList'
import { Login } from '@/pages/Login'
import type { Session } from '@supabase/supabase-js'

export function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [devBypass, setDevBypass] = useState(() =>
    localStorage.getItem('bifrost_dev_bypass') === 'true'
  )

  // Auto-sync Google OAuth tokens to user_google_tokens for Gmail sending
  const syncGmailTokens = useCallback(async (session: Session) => {
    if (!session.provider_token) return
    try {
      await fetch(`${env.VITE_SUPABASE_URL}/functions/v1/gmail-auth/callback`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          apikey: env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          // Pass the Google tokens directly — the edge function stores them
          provider_token: session.provider_token,
          provider_refresh_token: session.provider_refresh_token,
        }),
      })
    } catch {
      // Non-critical — Gmail features just won't work until manually connected
    }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.provider_token) syncGmailTokens(session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (_event === 'SIGNED_IN' && session?.provider_token) {
        syncGmailTokens(session)
      }
    })

    return () => subscription.unsubscribe()
  }, [syncGmailTokens])

  // Expose bypass toggle for dev — remove when auth is sorted
  ;(window as unknown as Record<string, unknown>).__bifrostDevBypass = (on: boolean) => {
    localStorage.setItem('bifrost_dev_bypass', String(on))
    setDevBypass(on)
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-300 border-t-teal-600" />
          <span className="font-display text-sm font-medium tracking-wide text-gray-400">Loading...</span>
        </div>
      </div>
    )
  }

  if (!session && !devBypass) {
    return <Login onDevBypass={() => { localStorage.setItem('bifrost_dev_bypass', 'true'); setDevBypass(true) }} />
  }

  return (
    <ErrorBoundary>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
          <Route path="/pipeline" element={<ErrorBoundary><Pipeline /></ErrorBoundary>} />
          <Route path="/campaigns" element={<ErrorBoundary><Campaigns /></ErrorBoundary>} />
          <Route path="/artists" element={<ErrorBoundary><Artists /></ErrorBoundary>} />
          <Route path="/outreach" element={<ErrorBoundary><Outreach /></ErrorBoundary>} />
          <Route path="/curators" element={<ErrorBoundary><Curators /></ErrorBoundary>} />
          <Route path="/financials" element={<ErrorBoundary><Financials /></ErrorBoundary>} />
          <Route path="/settings" element={<ErrorBoundary><Settings /></ErrorBoundary>} />
          <Route path="/excluded" element={<ErrorBoundary><ExcludeList /></ErrorBoundary>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Layout>
    </ErrorBoundary>
  )
}
