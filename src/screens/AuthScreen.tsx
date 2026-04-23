import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'

export default function AuthScreen() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const lastAttempt = useRef(0)

  async function handleSubmit() {
    if (!email.trim() || !password) return
    const now = Date.now()
    if (now - lastAttempt.current < 4000) return
    lastAttempt.current = now
    setLoading(true)
    setError('')
    setSuccess('')

    if (mode === 'signup') {
      const { error: err } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      })
      setLoading(false)
      if (err) {
        if (err.message.toLowerCase().includes('rate') || err.message.toLowerCase().includes('too many')) {
          setError('slow down a bit, try again in a moment')
        } else {
          setError(err.message)
        }
      } else {
        setSuccess('check your email to confirm your account')
      }
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      setLoading(false)
      if (err) {
        if (err.message.toLowerCase().includes('rate') || err.message.toLowerCase().includes('too many')) {
          setError('slow down a bit, try again in a moment')
        } else {
          setError(err.message.includes('Invalid') ? 'wrong email or password' : err.message)
        }
      }
    }
  }

  async function signInWithGoogle() {
    setGoogleLoading(true)
    setError('')
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (err) {
      setError(err.message)
      setGoogleLoading(false)
    }
  }

  function switchMode() {
    setMode(m => m === 'signin' ? 'signup' : 'signin')
    setError('')
    setSuccess('')
  }

  const inputClass = "w-full h-14 px-4 bg-surface text-[#f0f0f0] border border-[#2a2a2a] focus:outline-none focus:border-accent focus:shadow-[0_0_0_1px_#c8f542] text-base"
  const inputStyle = { fontFamily: "'Space Mono', monospace", fontSize: '16px' }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="min-h-screen bg-bg flex flex-col px-5"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex-1 flex flex-col justify-center max-w-md w-full mx-auto py-12">
        <div className="mb-8">
          <h1
            className="text-[44px] text-[#f0f0f0] leading-none mb-1"
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}
          >
            where tf did i park
          </h1>
          <div className="h-[2px] w-full bg-accent mb-4" />
          <p className="font-mono text-muted text-sm">for the chaotic parking lot that has no mercy</p>
        </div>

        <p className="font-mono text-[#f0f0f0] text-sm mb-8 leading-relaxed">
          {mode === 'signin' ? 'welcome back' : 'create an account so your spot survives a phone wipe'}
        </p>

        <div className="flex flex-col gap-3 mb-4">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="your email address"
            className={inputClass}
            style={inputStyle}
            autoComplete="email"
            autoCapitalize="none"
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="password"
            className={inputClass}
            style={inputStyle}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          />
        </div>

        {error && <p className="font-mono text-danger text-xs mb-3">{error}</p>}
        {success && <p className="font-mono text-accent text-xs mb-3">{success}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading || !email.trim() || !password}
          className="w-full h-16 bg-accent text-black text-2xl tracking-[0.08em] mb-4 active:scale-[0.97] transition-transform disabled:bg-[#1a1a1a] disabled:text-[#2e2e2e] disabled:cursor-not-allowed"
          style={{ fontFamily: "'Bebas Neue', sans-serif" }}
        >
          {loading ? (mode === 'signin' ? 'SIGNING IN...' : 'CREATING...') : (mode === 'signin' ? 'SIGN IN' : 'CREATE ACCOUNT')}
        </button>

        <button
          onClick={switchMode}
          className="w-full h-10 text-muted text-xs mb-6 active:scale-[0.97] transition-transform"
          style={{ fontFamily: "'Space Mono', monospace" }}
        >
          {mode === 'signin' ? "don't have an account? sign up" : 'already have an account? sign in'}
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-[#2a2a2a]" />
          <span className="font-mono text-muted text-xs">or</span>
          <div className="flex-1 h-px bg-[#2a2a2a]" />
        </div>

        <button
          onClick={signInWithGoogle}
          disabled={googleLoading}
          className="w-full h-12 bg-white text-black text-sm flex items-center justify-center gap-3 active:scale-[0.97] transition-transform disabled:opacity-60"
          style={{ fontFamily: "'Space Mono', monospace" }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#4285F4" d="M47.53 24.56c0-1.67-.15-3.28-.42-4.82H24v9.12h13.19c-.57 3.01-2.28 5.56-4.87 7.27v6.04h7.88c4.61-4.25 7.33-10.51 7.33-17.61z"/>
            <path fill="#34A853" d="M24 48c6.63 0 12.19-2.2 16.25-5.95l-7.88-6.04c-2.2 1.47-5.01 2.34-8.37 2.34-6.44 0-11.9-4.35-13.84-10.2H2.03v6.23C5.99 42.71 14.39 48 24 48z"/>
            <path fill="#FBBC05" d="M10.16 28.15A14.87 14.87 0 0 1 9.22 24c0-1.44.25-2.84.94-4.15v-6.23H2.03A23.97 23.97 0 0 0 0 24c0 3.89.93 7.57 2.03 10.38l8.13-6.23z"/>
            <path fill="#EA4335" d="M24 9.5c3.63 0 6.88 1.25 9.44 3.69l7.08-7.08C36.18 2.18 30.62 0 24 0 14.39 0 5.99 5.29 2.03 13.62l8.13 6.23C11.9 13.85 17.56 9.5 24 9.5z"/>
          </svg>
          {googleLoading ? 'redirecting...' : 'continue with google'}
        </button>
      </div>
    </motion.div>
  )
}
