import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LogOut, X, Share2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { User, VehicleProfile, SavedSpot } from '../types'
import { colorNameToHex } from '../utils/colorMap'
import { SIGNED_URL_EXPIRY_SECONDS } from '../constants'

interface HomeScreenProps {
  user: User
  vehicle: VehicleProfile
  activeSpot: SavedSpot | null
  onSave: () => void
  onFind: () => void
  onSpotCleared: () => void
  onSignOut: () => void
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function hoursUntil(dateStr: string): number {
  return Math.max(0, Math.round((new Date(dateStr).getTime() - Date.now()) / 3600000))
}

export default function HomeScreen({ user, vehicle, activeSpot, onSave, onFind, onSpotCleared, onSignOut }: HomeScreenProps) {
  const [clearConfirm, setClearConfirm] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [signOutConfirm, setSignOutConfirm] = useState(false)
  const [photoModal, setPhotoModal] = useState(false)
  const [error, setError] = useState('')
  const [signedPhotoUrl, setSignedPhotoUrl] = useState<string | null>(null)

  const dotColor = colorNameToHex(vehicle.color)

  const savedEmojis: [string, string, string] | null = useMemo(() => {
    if (!activeSpot?.emoji_code) return null
    try { return JSON.parse(activeSpot.emoji_code) } catch { return null }
  }, [activeSpot?.emoji_code])

  // Generate signed URL for photo
  useEffect(() => {
    if (!activeSpot?.photo_url) { setSignedPhotoUrl(null); return }
    if (activeSpot.photo_url.startsWith('http')) {
      setSignedPhotoUrl(activeSpot.photo_url)
      return
    }
    supabase.storage
      .from('parking-photos')
      .createSignedUrl(activeSpot.photo_url, SIGNED_URL_EXPIRY_SECONDS)
      .then(({ data }) => { if (data) setSignedPhotoUrl(data.signedUrl) })
  }, [activeSpot?.photo_url])

  // Auto-clear expired spots on mount
  useEffect(() => {
    if (!activeSpot?.auto_clear_at) return
    const expired = new Date(activeSpot.auto_clear_at).getTime() < Date.now()
    if (!expired) return
    supabase
      .from('saved_spots')
      .update({ is_active: false })
      .eq('id', activeSpot.id)
      .then(() => onSpotCleared())
  }, [activeSpot?.id, activeSpot?.auto_clear_at, onSpotCleared])

  async function handleClearSpot() {
    if (!activeSpot) return
    setClearing(true)
    setError('')

    if (activeSpot.photo_url && !activeSpot.photo_url.startsWith('http')) {
      await supabase.storage.from('parking-photos').remove([activeSpot.photo_url])
    } else if (activeSpot.photo_url) {
      const path = activeSpot.photo_url.split('/parking-photos/')[1]
      if (path) await supabase.storage.from('parking-photos').remove([path])
    }

    const { error: err } = await supabase
      .from('saved_spots')
      .update({ is_active: false })
      .eq('id', activeSpot.id)

    setClearing(false)
    if (err) {
      setError('failed to clear spot, try again')
      return
    }
    setClearConfirm(false)
    onSpotCleared()
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    onSignOut()
  }

  function handleShare() {
    const text = savedEmojis
      ? `find my vehicle ${savedEmojis.join('')} — where-tf-did-i-park.onrender.com`
      : `find my vehicle — where-tf-did-i-park.onrender.com`
    try {
      navigator.share({ text })
    } catch {
      navigator.clipboard.writeText(text)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="min-h-screen bg-bg flex flex-col"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <span className="font-mono text-muted text-xs truncate max-w-[240px]">{user.email}</span>
        <button
          onClick={() => setSignOutConfirm(true)}
          className="text-muted p-1 active:scale-[0.97] transition-transform"
          aria-label="Sign out"
        >
          <LogOut size={18} />
        </button>
      </div>

      <div className="flex-1 flex flex-col px-5 py-6 gap-6 max-w-md w-full mx-auto">
        {/* App name */}
        <div>
          <h1
            className="text-[44px] text-[#f0f0f0] leading-none mb-1"
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}
          >
            where tf did i park
          </h1>
          <div className="h-[2px] w-full bg-accent" />
        </div>

        {/* Active spot card */}
        {activeSpot && (
          <div className="bg-surface border border-border p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-mono text-accent text-xs uppercase tracking-widest mb-1">active spot</p>
                <p className="font-mono text-[#f0f0f0] text-sm">parked {relativeTime(activeSpot.saved_at)}</p>
                <p className="font-mono text-muted text-xs">±{Math.round(activeSpot.accuracy)}m GPS accuracy</p>
                {activeSpot.auto_clear_at && (
                  <p className="font-mono text-muted text-xs mt-0.5">
                    auto-clears in {hoursUntil(activeSpot.auto_clear_at)}h
                  </p>
                )}
              </div>
              {signedPhotoUrl && (
                <button
                  onClick={() => setPhotoModal(true)}
                  className="w-16 h-16 overflow-hidden border border-border flex-shrink-0 active:scale-[0.97] transition-transform"
                >
                  <img
                    src={signedPhotoUrl}
                    alt="parking spot"
                    className="w-full h-full object-cover"
                  />
                </button>
              )}
            </div>

            {/* Emoji code + DIGIPIN */}
            {savedEmojis && (
              <div className="flex flex-col items-center gap-1 py-3 border-t border-border border-b mb-3">
                <div className="text-3xl tracking-widest">{savedEmojis.join('  ')}</div>
                {activeSpot.digipin && (
                  <p className="font-mono text-accent text-sm tracking-widest mt-1">
                    {activeSpot.digipin}
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 mb-4 py-2 border-t border-border">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: dotColor, boxShadow: `0 0 5px ${dotColor}` }}
              />
              <span
                className="text-base text-[#f0f0f0] tracking-widest"
                style={{ fontFamily: "'Bebas Neue', sans-serif" }}
              >
                {vehicle.make} • {vehicle.color} • {vehicle.plate}
              </span>
            </div>

            {error && <p className="font-mono text-danger text-xs mb-3">{error}</p>}

            <div className="flex items-center justify-between">
              {clearConfirm ? (
                <div className="flex gap-2 flex-1">
                  <button
                    onClick={handleClearSpot}
                    disabled={clearing}
                    className="flex-1 h-10 bg-danger text-[#f0f0f0] text-sm active:scale-[0.97] transition-transform disabled:opacity-60"
                    style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.06em', fontSize: '16px' }}
                  >
                    {clearing ? 'CLEARING...' : 'YES CLEAR IT'}
                  </button>
                  <button
                    onClick={() => setClearConfirm(false)}
                    className="flex-1 h-10 border border-[#2a2a2a] text-muted text-sm active:scale-[0.97] transition-transform"
                    style={{ fontFamily: "'Space Mono', monospace" }}
                  >
                    keep it
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => setClearConfirm(true)}
                    className="font-mono text-muted text-xs underline underline-offset-2 active:text-danger transition-colors"
                  >
                    clear spot
                  </button>
                  <button
                    onClick={handleShare}
                    className="flex items-center gap-1 text-muted active:text-accent transition-colors"
                  >
                    <Share2 size={14} />
                    <span className="font-mono text-xs">share</span>
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={onSave}
            className="w-full h-16 bg-accent text-black text-2xl tracking-[0.08em] active:scale-[0.97] transition-transform"
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}
          >
            I'M PARKING NOW
          </button>
          <button
            onClick={activeSpot ? onFind : undefined}
            disabled={!activeSpot}
            className="w-full h-16 border-2 border-accent text-accent text-2xl tracking-[0.08em] active:scale-[0.97] transition-transform disabled:bg-[#1a1a1a] disabled:border-[#1a1a1a] disabled:text-[#2e2e2e] disabled:cursor-not-allowed"
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}
          >
            {activeSpot ? 'FIND MY VEHICLE' : 'PARK FIRST, GENIUS'}
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-border">
        <p className="font-mono text-muted text-xs text-center">where tf did i park • free forever • no bs</p>
      </div>

      {/* Photo modal */}
      <AnimatePresence>
        {photoModal && signedPhotoUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
            onClick={() => setPhotoModal(false)}
          >
            <button
              className="absolute top-4 right-4 text-[#f0f0f0] p-2"
              onClick={() => setPhotoModal(false)}
            >
              <X size={24} />
            </button>
            <img
              src={signedPhotoUrl}
              alt="parking spot"
              className="max-w-full max-h-full object-contain"
              onClick={e => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sign out confirm modal */}
      <AnimatePresence>
        {signOutConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-end justify-center z-50 p-5"
            onClick={() => setSignOutConfirm(false)}
          >
            <motion.div
              initial={{ y: 40 }}
              animate={{ y: 0 }}
              exit={{ y: 40 }}
              className="w-full max-w-md bg-surface border border-border p-6"
              onClick={e => e.stopPropagation()}
            >
              <p
                className="text-2xl text-[#f0f0f0] mb-6 text-center"
                style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}
              >
                sign out?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleSignOut}
                  className="flex-1 h-12 bg-danger text-[#f0f0f0] active:scale-[0.97] transition-transform"
                  style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em', fontSize: '18px' }}
                >
                  YEAH SIGN ME OUT
                </button>
                <button
                  onClick={() => setSignOutConfirm(false)}
                  className="flex-1 h-12 border border-[#2a2a2a] text-muted active:scale-[0.97] transition-transform"
                  style={{ fontFamily: "'Space Mono', monospace", fontSize: '13px' }}
                >
                  nah stay
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
