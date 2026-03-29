import { useState } from 'react'
import { supabase } from '@/lib/supabase'

type Mode = 'signin' | 'signup'

export function Login({ onDevBypass }: { onDevBypass?: () => void } = {}) {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    if (mode === 'signup') {
      if (password !== confirmPassword) {
        setError('Passwords do not match')
        setLoading(false)
        return
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters')
        setLoading(false)
        return
      }

      const { error } = await supabase.auth.signUp({ email, password })

      if (error) {
        setError(error.message)
      } else {
        setSuccess('Account created! You can now sign in.')
        setMode('signin')
        setPassword('')
        setConfirmPassword('')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        if (error.message === 'Email not confirmed') {
          setError('Email not confirmed. Check your Supabase auth settings, or use "Skip login" below.')
        } else {
          setError(error.message)
        }
      }
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen">
      {/* Left side — branding */}
      <div className="hidden lg:flex lg:w-1/2 lg:flex-col lg:justify-between bg-gradient-to-br from-teal-500 via-cyan-500 to-teal-600 p-12 text-white relative overflow-hidden">
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shadow-lg">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424a.622.622 0 01-.857.207c-2.348-1.435-5.304-1.76-8.785-.964a.622.622 0 11-.277-1.214c3.808-.87 7.076-.496 9.712 1.114a.623.623 0 01.207.857zm1.224-2.719a.78.78 0 01-1.072.257c-2.687-1.652-6.785-2.131-9.965-1.166a.78.78 0 01-.973-.517.781.781 0 01.517-.972c3.632-1.102 8.147-.569 11.236 1.327a.78.78 0 01.257 1.071zm.105-2.835C14.692 8.95 9.375 8.775 6.297 9.71a.936.936 0 11-.543-1.791c3.532-1.072 9.404-.865 13.115 1.338a.936.936 0 01-.954 1.613z"/>
              </svg>
            </div>
            <div>
              <span className="font-display text-xl font-bold tracking-tight">BIFROST</span>
              <p className="text-sm text-white/70">Campaign Manager</p>
            </div>
          </div>
        </div>

        <div className="relative space-y-8">
          <div>
            <h1 className="font-display text-4xl font-bold leading-tight tracking-tight">
              Manage your playlist
              <br />
              placements at scale.
            </h1>
            <p className="mt-4 text-lg text-white/80 leading-relaxed">
              Pipeline, outreach, campaigns, and financials — all in one place.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { title: 'Pipeline', desc: 'Track every lead' },
              { title: 'Outreach', desc: 'Bulk email at scale' },
              { title: 'Campaigns', desc: 'Manage placements' },
              { title: 'Financials', desc: 'Track every dollar' },
            ].map((item) => (
              <div key={item.title} className="rounded-xl bg-white/10 backdrop-blur-sm p-4 border border-white/10">
                <div className="text-lg font-bold">{item.title}</div>
                <div className="text-sm text-white/70">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative text-sm text-white/40">
          Internal tool — not for distribution
        </div>
      </div>

      {/* Right side — auth form */}
      <div className="flex flex-1 flex-col justify-center bg-gray-50 px-8 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <div className="lg:hidden mb-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 shadow-md">
                <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424a.622.622 0 01-.857.207c-2.348-1.435-5.304-1.76-8.785-.964a.622.622 0 11-.277-1.214c3.808-.87 7.076-.496 9.712 1.114a.623.623 0 01.207.857zm1.224-2.719a.78.78 0 01-1.072.257c-2.687-1.652-6.785-2.131-9.965-1.166a.78.78 0 01-.973-.517.781.781 0 01.517-.972c3.632-1.102 8.147-.569 11.236 1.327a.78.78 0 01.257 1.071zm.105-2.835C14.692 8.95 9.375 8.775 6.297 9.71a.936.936 0 11-.543-1.791c3.532-1.072 9.404-.865 13.115 1.338a.936.936 0 01-.954 1.613z"/>
                </svg>
              </div>
              <div>
                <div className="font-display text-lg font-bold text-gray-900">BIFROST</div>
                <div className="text-xs text-gray-400">Campaign Manager</div>
              </div>
            </div>
          </div>

          <h2 className="font-display text-2xl font-bold text-gray-900">
            {mode === 'signin' ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="mt-1 text-sm text-gray-400">
            {mode === 'signin'
              ? 'Sign in to your account'
              : 'Set up your admin account'}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-50 px-4 py-3 text-sm text-emerald-600">
                {success}
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field w-full"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field w-full"
                placeholder={mode === 'signup' ? 'At least 6 characters' : 'Enter your password'}
                required
              />
            </div>

            {mode === 'signup' && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-500">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field w-full"
                  placeholder="Re-enter your password"
                  required
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50"
            >
              {loading
                ? mode === 'signin'
                  ? 'Signing in...'
                  : 'Creating account...'
                : mode === 'signin'
                  ? 'Sign in'
                  : 'Create account'}
            </button>
          </form>

          {onDevBypass && (
            <button
              type="button"
              onClick={onDevBypass}
              className="mt-4 w-full rounded-lg border border-dashed border-gray-300 py-2.5 text-sm text-gray-400 hover:border-teal-400 hover:text-teal-500 transition-colors"
            >
              Skip login (dev mode)
            </button>
          )}

          <div className="mt-6 text-center text-sm text-gray-400">
            {mode === 'signin' ? (
              <>
                Need an account?{' '}
                <button
                  onClick={() => { setMode('signup'); setError(null); setSuccess(null) }}
                  className="font-medium text-teal-500 hover:text-teal-500 transition-colors"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  onClick={() => { setMode('signin'); setError(null); setSuccess(null) }}
                  className="font-medium text-teal-500 hover:text-teal-500 transition-colors"
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
