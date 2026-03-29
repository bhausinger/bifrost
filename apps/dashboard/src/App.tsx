import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Layout } from '@/components/layout/Layout'
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

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
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/pipeline" element={<Pipeline />} />
        <Route path="/campaigns" element={<Campaigns />} />
        <Route path="/artists" element={<Artists />} />
        <Route path="/outreach" element={<Outreach />} />
        <Route path="/curators" element={<Curators />} />
        <Route path="/financials" element={<Financials />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/excluded" element={<ExcludeList />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  )
}
