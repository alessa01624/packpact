'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const supabase = createClient()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const hashParams = new URLSearchParams(window.location.hash.slice(1))

    // Supabase error in URL (expired link)
    const urlError = params.get('error') || hashParams.get('error')
    if (urlError) {
      setError('This reset link has expired. Please request a new one.')
      setReady(true)
      return
    }

    // PKCE: code in URL — exchange it client-side
    const code = params.get('code')
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error: err }) => {
        if (!err) {
          setReady(true)
        } else {
          setError('Invalid or expired link. Please request a new one.')
          setReady(true)
        }
      })
      return
    }

    // No code in URL: the server-side callback already exchanged it.
    // Just check we have a valid session.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setReady(true)
      } else {
        // No session at all — not a valid reset flow
        window.location.href = '/login'
      }
    })
  }, [])

  async function handleSubmit() {
    if (!password || !confirm) { setError('Please fill in both fields'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    setLoading(true)
    setError('')
    const { error: err } = await supabase.auth.updateUser({ password })
    if (err) { setError(err.message); setLoading(false); return }
    await supabase.auth.signOut()
    setSuccess('Password updated! Please sign in with your new password.')
    setTimeout(() => { window.location.href = '/login' }, 2000)
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4">
        <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
        <p className="text-zinc-500 text-sm">Verifying reset link...</p>
      </div>
    )
  }

  if (error && !success) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm space-y-6 text-center"
        >
          <div className="text-5xl">⏰</div>
          <h1 className="text-2xl font-extrabold text-white">Link expired</h1>
          <p className="text-red-400 text-sm">{error}</p>
          <button
            onClick={() => window.location.href = '/login'}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-2xl text-sm transition-all"
          >
            ← Request a new link
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm space-y-7"
      >
        <div className="text-center space-y-3">
          <div className="text-5xl">🔐</div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">New password</h1>
          <p className="text-zinc-400 text-sm">Choose a new password for your account.</p>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="New password"
              autoComplete="new-password"
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

          <input
            type={showPassword ? 'text' : 'password'}
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="Confirm new password"
            autoComplete="new-password"
            className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-2xl px-4 py-4 text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
          />

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          {success && <p className="text-emerald-400 text-sm text-center">{success}</p>}

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-bold py-4 rounded-2xl text-sm transition-all"
          >
            {loading
              ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
              : 'Set new password →'}
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}
