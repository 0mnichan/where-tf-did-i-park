import { useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { User } from '../types'

interface SetupScreenProps {
  user: User
  onComplete: () => void
}

export default function SetupScreen({ user, onComplete }: SetupScreenProps) {
  const [make, setMake] = useState('')
  const [color, setColor] = useState('')
  const [plate, setPlate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!make.trim() || !color.trim() || !plate.trim()) {
      setError('fill in all fields')
      return
    }
    setLoading(true)
    setError('')
    const { error: err } = await supabase.from('vehicle_profiles').insert({
      user_id: user.id,
      make: make.trim(),
      color: color.trim(),
      plate: plate.trim().slice(0, 4),
    })
    setLoading(false)
    if (err) {
      console.error('vehicle_profiles insert error:', err)
      setError(err.message || 'something went wrong, try again')
      return
    }
    onComplete()
  }

  const inputClass =
    "w-full h-14 px-4 bg-surface text-[#f0f0f0] border border-[#2a2a2a] focus:outline-none focus:border-accent focus:shadow-[0_0_0_1px_#c8f542]"
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
        <h1
          className="text-[44px] text-[#f0f0f0] leading-none mb-1"
          style={{ fontFamily: "'Bebas Neue', sans-serif" }}
        >
          your ride
        </h1>
        <div className="h-[2px] w-full bg-accent mb-6" />

        <p className="font-mono text-muted text-sm mb-8 leading-relaxed">
          tell us about your vehicle once. we'll remind you when you're lost.
        </p>

        <div className="flex flex-col gap-3 mb-6">
          <div>
            <label className="font-mono text-muted text-xs mb-1 block uppercase tracking-widest">Make / Model</label>
            <input
              type="text"
              value={make}
              onChange={e => setMake(e.target.value)}
              placeholder="Honda Activa, Royal Enfield, TVS Jupiter..."
              className={inputClass}
              style={inputStyle}
            />
          </div>
          <div>
            <label className="font-mono text-muted text-xs mb-1 block uppercase tracking-widest">Color</label>
            <input
              type="text"
              value={color}
              onChange={e => setColor(e.target.value)}
              placeholder="Matte black, red, white..."
              className={inputClass}
              style={inputStyle}
            />
          </div>
          <div>
            <label className="font-mono text-muted text-xs mb-1 block uppercase tracking-widest">Last 4 digits of plate</label>
            <input
              type="text"
              value={plate}
              onChange={e => setPlate(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="4521"
              maxLength={4}
              inputMode="numeric"
              pattern="\d*"
              className={inputClass}
              style={inputStyle}
            />
          </div>
        </div>

        {error && <p className="font-mono text-danger text-xs mb-4">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full h-16 bg-accent text-black text-2xl tracking-[0.08em] active:scale-[0.97] transition-transform disabled:bg-[#1a1a1a] disabled:text-[#2e2e2e] disabled:cursor-not-allowed"
          style={{ fontFamily: "'Bebas Neue', sans-serif" }}
        >
          {loading ? 'SAVING...' : "LET'S GO →"}
        </button>
      </div>
    </motion.div>
  )
}
