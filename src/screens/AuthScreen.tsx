import { useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import OTPInput from '../components/OTPInput'

export default function AuthScreen() {
  const [email, setEmail] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [googleLoading, setGoogleLoading] = useState(false)

  async function sendOTP() {
    if (!email.trim()) return
    setLoading(true)
    setError('')
    const { error: err } = await supabase.auth.signInWithOtp({ email: email.trim() })
    setLoading(false)
    if (err) {
      if (err.message.includes('rate') || err.message.includes('too many')) {
        setError('too many requests, chill')
      } else {
        setError(err.message)
      }
      return
    }
    setOtpSent(true)
  }

  async function verifyOTP() {
    const token = otp.join('')
    if (token.length < 6) return
    setLoading(true)
    setError('')
    const { error: err } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token,
      type: 'email',
    })
    setLoading(false)
    if (err) {
      setError('invalid code, try again')
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
        {/* App name */}
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
          create an account so your spot survives a phone wipe
        </p>

        {!otpSent ? (
          <>
            <div className="mb-3">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendOTP()}
                placeholder="your email address"
                className="w-full h-14 px-4 bg-surface text-[#f0f0f0] border border-[#2a2a2a] focus:outline-none focus:border-accent focus:shadow-[0_0_0_1px_#c8f542] text-base"
                style={{ fontFamily: "'Space Mono', monospace", fontSize: '16px' }}
                autoComplete="email"
                autoCapitalize="none"
              />
            </div>
            {error && (
              <p className="font-mono text-danger text-xs mb-3">{error}</p>
            )}
            <button
              onClick={sendOTP}
              disabled={loading || !email.trim()}
              className="w-full h-16 bg-accent text-black text-2xl tracking-[0.08em] mb-6 active:scale-[0.97] transition-transform disabled:bg-[#1a1a1a] disabled:text-[#2e2e2e] disabled:cursor-not-allowed"
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}
            >
              {loading ? 'SENDING...' : 'SEND ME A LOGIN LINK'}
            </button>
          </>
        ) : (
          <>
            <p className="font-mono text-[#f0f0f0] text-sm mb-4">
              check your email for a 6-digit code
            </p>
            <div className="mb-4">
              <OTPInput value={otp} onChange={setOtp} />
            </div>
            {error && (
              <p className="font-mono text-danger text-xs mb-3 text-center">{error}</p>
            )}
            <button
              onClick={verifyOTP}
              disabled={loading || otp.join('').length < 6}
              className="w-full h-16 bg-accent text-black text-2xl tracking-[0.08em] mb-3 active:scale-[0.97] transition-transform disabled:bg-[#1a1a1a] disabled:text-[#2e2e2e] disabled:cursor-not-allowed"
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}
            >
              {loading ? 'VERIFYING...' : 'VERIFY'}
            </button>
            <button
              onClick={() => { setOtpSent(false); setOtp(['','','','','','']); setError('') }}
              className="w-full h-12 border border-[#2a2a2a] text-muted text-sm mb-6 active:scale-[0.97] transition-transform"
              style={{ fontFamily: "'Space Mono', monospace" }}
            >
              ← back
            </button>
          </>
        )}

        {/* Divider */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-[#2a2a2a]" />
          <span className="font-mono text-muted text-xs">or</span>
          <div className="flex-1 h-px bg-[#2a2a2a]" />
        </div>

        {/* Google OAuth */}
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
