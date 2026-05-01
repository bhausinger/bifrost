import { Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense, useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { gmailSyncTokens } from '@/lib/api/gmail'
import { Layout } from '@/components/layout/Layout'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Login } from '@/pages/Login'
import type { Session } from '@supabase/supabase-js'

const Dashboard = lazy(() => import('@/pages/Dashboard').then(m => ({ default: m.Dashboard })))
const Pipeline = lazy(() => import('@/pages/Pipeline').then(m => ({ default: m.Pipeline })))
const Campaigns = lazy(() => import('@/pages/Campaigns').then(m => ({ default: m.Campaigns })))
const Artists = lazy(() => import('@/pages/Artists').then(m => ({ default: m.Artists })))
const Outreach = lazy(() => import('@/pages/Outreach').then(m => ({ default: m.Outreach })))
const Curators = lazy(() => import('@/pages/Curators').then(m => ({ default: m.Curators })))
const Financials = lazy(() => import('@/pages/Financials').then(m => ({ default: m.Financials })))
const Settings = lazy(() => import('@/pages/Settings').then(m => ({ default: m.Settings })))
const ExcludeList = lazy(() => import('@/pages/ExcludeList').then(m => ({ default: m.ExcludeList })))

function PageLoader() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-300 border-t-teal-600" />
        <span className="font-display text-sm font-medium tracking-wide text-gray-400">Loading...</span>
      </div>
    </div>
  )
}

export function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  // Auto-sync Google OAuth tokens to user_google_tokens for Gmail sending
  const syncGmailTokens = useCallback(async (session: Session) => {
    if (!session.provider_token) return
    try {
      await gmailSyncTokens({
        provider_token: session.provider_token,
        provider_refresh_token: session.provider_refresh_token ?? null,
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

  if (!session) {
    return <Login />
  }

  return (
    <ErrorBoundary>
      <Layout>
        <Suspense fallback={<PageLoader />}>
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
        </Suspense>
      </Layout>
    </ErrorBoundary>
  )
}
