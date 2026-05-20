'use client'
import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  return <Suspense><LoginInner /></Suspense>
}

function LoginInner() {
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState<'email' | 'google' | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/'
  const supabase = createClient()

  function switchMode(m: 'login' | 'register' | 'reset') {
    setMode(m)
    setError('')
    setSuccess('')
  }

  async function handleEmailAuth() {
    if (!email.trim() || (mode !== 'reset' && !password)) {
      setError('Please enter your email and password')
      return
    }
    setLoading('email')
    setError('')
    setSuccess('')

    if (mode === 'login') {
      const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (err) {
        setError('Wrong email or password. Please try again.')
        setLoading(null)
        return
      }
      window.location.href = next

    } else if (mode === 'register') {
      const { error: err } = await supabase.auth.signUp({ email: email.trim(), password })
      if (err) {
        setError(err.message.includes('already registered')
          ? 'Email already registered. Please sign in.'
          : err.message)
        setLoading(null)
        return
      }
      setSuccess('Account created! You can now sign in.')
      setMode('login')
      setLoading(null)

    } else {
      // reset
      if (!email.trim()) {
        setError('Please enter your email address')
        setLoading(null)
        return
      }
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin}/auth/callback`,
      })
      if (err) {
        setError(err.message)
        setLoading(null)
        return
      }
      setSuccess('Password reset email sent! Check your inbox.')
      setLoading(null)
    }
  }

  async function signInGoogle() {
    setLoading('google')
    if (next !== '/') {
      document.cookie = `auth_next=${encodeURIComponent(next)}; path=/; max-age=300; samesite=lax`
    }
    const base = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${base}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm space-y-7"
      >
        {/* Logo */}
        <div className="text-center space-y-3">
          <div className="text-5xl">🧳</div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">PackPact</h1>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Group trips, without the drama.<br />
            Vote, decide, go.
          </p>
        </div>

        {mode !== 'reset' ? (
          <>
            {/* Mode toggle */}
            <div className="flex bg-zinc-900 rounded-2xl p-1">
              <button
                onClick={() => switchMode('login')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  mode === 'login' ? 'bg-zinc-700 text-white' : 'text-zinc-500'
                }`}
              >
                Sign in
              </button>
              <button
                onClick={() => switchMode('register')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  mode === 'register' ? 'bg-zinc-700 text-white' : 'text-zinc-500'
                }`}
              >
                Register
              </button>
            </div>

            {/* Fields */}
            <div className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email"
                autoComplete="email"
                className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-2xl px-4 py-4 text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              />
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleEmailAuth()}
                  placeholder="Password"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-2xl px-4 py-4 pr-12 text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {mode === 'login' && (
                <div className="text-right">
                  <button
                    onClick={() => switchMode('reset')}
                    className="text-zinc-500 hover:text-zinc-300 text-xs transition-colors"
                  >
                    Forgot your password?
                  </button>
                </div>
              )}

              {error && <p className="text-red-400 text-sm text-center">{error}</p>}
              {success && <p className="text-emerald-400 text-sm text-center">{success}</p>}

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleEmailAuth}
                disabled={loading !== null}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-bold py-4 rounded-2xl text-sm transition-all"
              >
                {loading === 'email' ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                ) : mode === 'login' ? 'Sign in →' : 'Create account →'}
              </motion.button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-zinc-800" />
              <span className="text-zinc-600 text-xs">or</span>
              <div className="flex-1 h-px bg-zinc-800" />
            </div>

            {/* Google */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={signInGoogle}
              disabled={loading !== null}
              className="w-full flex items-center justify-center gap-3 bg-white text-zinc-900 font-semibold py-4 rounded-2xl text-sm shadow-lg disabled:opacity-60 transition-opacity"
            >
              {loading === 'google' ? (
                <div className="w-5 h-5 border-2 border-zinc-300 border-t-zinc-800 rounded-full animate-spin" />
              ) : (
                <GoogleIcon />
              )}
              Continue with Google
            </motion.button>
          </>
        ) : (
          /* Reset password screen */
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <h2 className="text-white font-bold text-lg">Reset your password</h2>
              <p className="text-zinc-400 text-sm">Enter your email and we&apos;ll send you a reset link.</p>
            </div>

            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleEmailAuth()}
              placeholder="Email"
              autoComplete="email"
              className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-2xl px-4 py-4 text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
            />

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            {success && <p className="text-emerald-400 text-sm text-center">{success}</p>}

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleEmailAuth}
              disabled={loading !== null}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-bold py-4 rounded-2xl text-sm transition-all"
            >
              {loading === 'email' ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
              ) : 'Send reset link →'}
            </motion.button>

            <button
              onClick={() => switchMode('login')}
              className="w-full text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
            >
              ← Back to sign in
            </button>
          </div>
        )}

        <p className="text-center text-zinc-600 text-xs">
          By signing in you agree to our terms of service.<br />
          No spam, promised. 🤝
        </p>
      </motion.div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.909-2.259c-.806.54-1.837.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}
