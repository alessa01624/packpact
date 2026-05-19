'use client'
import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  return <Suspense><LoginInner /></Suspense>
}

function LoginInner() {
  const [loading, setLoading] = useState<'google' | 'apple' | null>(null)
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/'
  const supabase = createClient()

  async function signIn(provider: 'google' | 'apple') {
    setLoading(provider)
    const base = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin
    await supabase.auth.signInWithOAuth({
      provider,
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
        className="w-full max-w-sm space-y-8"
      >
        {/* Logo */}
        <div className="text-center space-y-3">
          <div className="text-5xl">🧳</div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">PackPact</h1>
          <p className="text-zinc-400 text-sm leading-relaxed">
            La vacanza di gruppo, senza litigi.<br />
            Vota, decidi, parti.
          </p>
        </div>

        {/* Auth buttons */}
        <div className="space-y-3">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => signIn('google')}
            disabled={loading !== null}
            className="w-full flex items-center justify-center gap-3 bg-white text-zinc-900 font-semibold py-4 rounded-2xl text-sm shadow-lg disabled:opacity-60 transition-opacity"
          >
            {loading === 'google' ? (
              <div className="w-5 h-5 border-2 border-zinc-300 border-t-zinc-800 rounded-full animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            Continua con Google
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => signIn('apple')}
            disabled={loading !== null}
            className="w-full flex items-center justify-center gap-3 bg-zinc-900 border border-zinc-700 text-white font-semibold py-4 rounded-2xl text-sm disabled:opacity-60 transition-opacity"
          >
            {loading === 'apple' ? (
              <div className="w-5 h-5 border-2 border-zinc-600 border-t-zinc-200 rounded-full animate-spin" />
            ) : (
              <AppleIcon />
            )}
            Continua con Apple
          </motion.button>
        </div>

        <p className="text-center text-zinc-600 text-xs">
          Accedendo accetti i nostri termini di servizio.<br />
          Nessuna spam, promesso. 🤝
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

function AppleIcon() {
  return (
    <svg width="16" height="18" viewBox="0 0 16 18" fill="none">
      <path d="M13.544 9.585c-.021-2.163 1.765-3.213 1.845-3.264-1.006-1.469-2.568-1.67-3.127-1.691-1.328-.135-2.593.782-3.267.782-.673 0-1.714-.764-2.818-.744-1.44.021-2.773.838-3.517 2.127C.916 9.118 1.977 14.028 3.694 16.7c.854 1.308 1.872 2.777 3.207 2.726 1.291-.051 1.776-.832 3.335-.832 1.558 0 1.999.832 3.353.806 1.388-.024 2.265-1.335 3.105-2.648.987-1.52 1.387-2.992 1.406-3.068-.032-.013-2.688-1.03-2.712-3.099h-.844zM11.258 3.113C11.97 2.243 12.448 1.046 12.314 0c-1.155.047-2.55.769-3.378 1.639-.742.766-1.392 1.983-1.218 3.153 1.284.099 2.598-.652 3.54-1.679z" fill="white"/>
    </svg>
  )
}
