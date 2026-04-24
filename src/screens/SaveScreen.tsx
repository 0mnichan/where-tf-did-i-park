import { useState, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Camera, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useGeolocation } from '../hooks/useGeolocation'
import { useOrientation } from '../hooks/useOrientation'
import { encodeDIGIPIN } from '../utils/digipin'
import { digipinToEmojis } from '../utils/emojiCode'
import { SAVE_SUCCESS_REDIRECT_MS } from '../constants'
import { User } from '../types'
import PermissionError from '../components/PermissionError'

interface SaveScreenProps {
  user: User
  onBack: () => void
  onSaved: () => void
}

type AccuracyLevel = 'good' | 'ok' | 'bad'

function accuracyLevel(acc: number): AccuracyLevel {
  if (acc <= 15) return 'good'
  if (acc <= 30) return 'ok'
  return 'bad'
}

function headingToDir(heading: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  return dirs[Math.round((heading % 360) / 45) % 8]
}

export default function SaveScreen({ user, onBack, onSaved }: SaveScreenProps) {
  const geo = useGeolocation()
  const orientation = useOrientation()
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [savedEmojis, setSavedEmojis] = useState<[string, string, string] | null>(null)
  const [error, setError] = useState('')
  const photoStreamRef = useRef<MediaStream | null>(null)

  const liveDigipin = useMemo(() => {
    if (!geo.lat || !geo.lng) return null
    try { return encodeDIGIPIN(geo.lat, geo.lng) } catch { return null }
  }, [geo.lat, geo.lng])

  const liveEmojis = useMemo(() => {
    if (!liveDigipin) return null
    try { return digipinToEmojis(liveDigipin) } catch { return null }
  }, [liveDigipin])

  type OrientationEventConstructorWithPermission = typeof DeviceOrientationEvent & {
    requestPermission: () => Promise<PermissionState>
  }

  async function requestOrientationIfNeeded() {
    const DOE = DeviceOrientationEvent as unknown as OrientationEventConstructorWithPermission
    if (typeof DOE.requestPermission === 'function') {
      try {
        await DOE.requestPermission()
      } catch {
        // Denied or failed — proceed anyway
      }
    }
  }

  async function capturePhoto() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      photoStreamRef.current = stream
      const track = stream.getVideoTracks()[0]
      const settings = track.getSettings()

      const canvas = document.createElement('canvas')
      canvas.width = settings.width ?? 1280
      canvas.height = settings.height ?? 720

      await new Promise(r => setTimeout(r, 300))

      const video = document.createElement('video')
      video.muted = true
      video.playsInline = true
      video.srcObject = stream
      await video.play()

      const ctx = canvas.getContext('2d')!
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      stream.getTracks().forEach(t => t.stop())
      photoStreamRef.current = null

      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8))
      if (!blob) return

      setPhotoBlob(blob)
      setPhotoPreview(URL.createObjectURL(blob))
    } catch {
      setError('could not access camera')
    }
  }

  function clearPhoto() {
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoBlob(null)
    setPhotoPreview(null)
  }

  async function lockInSpot() {
    if (!geo.lat || !geo.lng || !geo.accuracy) return

    await requestOrientationIfNeeded()
    setSaving(true)
    setError('')

    let photoPath: string | null = null

    if (photoBlob) {
      try {
        const path = `${user.id}/${Date.now()}.jpg`
        const { data, error: uploadErr } = await supabase.storage
          .from('parking-photos')
          .upload(path, photoBlob, { contentType: 'image/jpeg' })

        if (!uploadErr && data) {
          photoPath = data.path
        }
      } catch {
        setError('photo upload failed, spot saved anyway')
      }
    }

    const digipin = liveDigipin
    const emojis = liveEmojis

    // Deactivate previous spots
    await supabase
      .from('saved_spots')
      .update({ is_active: false })
      .eq('user_id', user.id)
      .eq('is_active', true)

    const { error: insertErr } = await supabase.from('saved_spots').insert({
      user_id: user.id,
      lat: geo.lat,
      lng: geo.lng,
      accuracy: geo.accuracy,
      heading: orientation.smoothedHeading,
      pitch: orientation.pitch,
      photo_url: photoPath,
      is_active: true,
      digipin,
      emoji_code: emojis ? JSON.stringify(emojis) : null,
    })

    setSaving(false)

    if (insertErr) {
      setError('connection failed, try again')
      return
    }

    setSavedEmojis(emojis)
    setSaved(true)
    setTimeout(() => {
      onSaved()
    }, SAVE_SUCCESS_REDIRECT_MS)
  }

  if (geo.error && geo.error.includes('denied')) {
    return <PermissionError
      title="NO GPS"
      message={geo.error + '\n\nYou need location access to save your parking spot.'}
      onBack={onBack}
    />
  }

  const accLevel = geo.accuracy ? accuracyLevel(geo.accuracy) : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="min-h-screen bg-bg flex flex-col"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Header */}
      <div className="flex items-center px-5 py-3 border-b border-border">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-muted active:text-[#f0f0f0] transition-colors"
        >
          <ChevronLeft size={20} />
          <span className="font-mono text-sm">back</span>
        </button>
        <h2
          className="text-2xl text-[#f0f0f0] mx-auto"
          style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}
        >
          LOCK IN SPOT
        </h2>
        <div className="w-16" />
      </div>

      <div className="flex-1 flex flex-col px-5 py-6 gap-6 max-w-md w-full mx-auto">
        {/* GPS Status */}
        <div className="bg-surface border border-border p-4">
          {geo.loading ? (
            <div className="flex items-center gap-3">
              <span
                className="w-3 h-3 rounded-full bg-accent animate-pulse"
                style={{ animation: 'pulse-ring 1.2s ease-in-out infinite' }}
              />
              <span className="font-mono text-[#f0f0f0] text-sm">acquiring your location... hold still</span>
            </div>
          ) : geo.error ? (
            <p className="font-mono text-danger text-sm">{geo.error}</p>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-2">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: accLevel === 'good' ? '#c8f542' : accLevel === 'ok' ? '#ffc832' : '#ff3b30',
                    boxShadow: `0 0 6px ${accLevel === 'good' ? '#c8f542' : accLevel === 'ok' ? '#ffc832' : '#ff3b30'}`,
                  }}
                />
                <span
                  className="font-mono text-sm"
                  style={{
                    color: accLevel === 'good' ? '#c8f542' : accLevel === 'ok' ? '#ffc832' : '#ff3b30',
                  }}
                >
                  {accLevel === 'good'
                    ? `GPS locked (±${Math.round(geo.accuracy!)}m)`
                    : `GPS is being dramatic (±${Math.round(geo.accuracy!)}m) — try moving to open sky`}
                </span>
              </div>
              {orientation.smoothedHeading !== null && (
                <p className="font-mono text-muted text-xs">
                  facing {headingToDir(orientation.smoothedHeading)}
                </p>
              )}
              {accLevel === 'bad' && (
                <p className="font-mono text-danger text-xs mt-2">
                  accuracy is poor but you can still save — it might be off by {Math.round(geo.accuracy!)}m
                </p>
              )}
            </>
          )}
        </div>

        {/* Live DIGIPIN + emoji preview */}
        {liveDigipin && liveEmojis && (
          <div className="bg-surface border border-accent/30 p-4 flex flex-col items-center gap-2">
            <p className="font-mono text-muted text-xs uppercase tracking-widest">your spot</p>
            <div className="text-4xl tracking-widest">{liveEmojis.join('  ')}</div>
            <p
              className="text-xl text-accent tracking-widest"
              style={{ fontFamily: "'Space Mono', monospace" }}
            >
              {liveDigipin}
            </p>
          </div>
        )}

        {/* Photo section */}
        <div className="bg-surface border border-border p-4">
          <p className="font-mono text-muted text-xs mb-3 uppercase tracking-widest">photo (optional but seriously helps)</p>
          {photoPreview ? (
            <div className="relative">
              <img
                src={photoPreview}
                alt="parking spot preview"
                className="w-full h-40 object-cover"
              />
              <button
                onClick={clearPhoto}
                className="absolute top-2 right-2 bg-black/70 text-[#f0f0f0] p-1.5 flex items-center gap-1 active:scale-[0.97] transition-transform"
              >
                <RefreshCw size={14} />
                <span className="font-mono text-xs">retake</span>
              </button>
            </div>
          ) : (
            <button
              onClick={capturePhoto}
              className="w-full h-24 border border-dashed border-[#2a2a2a] flex items-center justify-center gap-3 text-muted active:border-accent active:text-accent transition-colors"
            >
              <Camera size={24} />
              <span className="font-mono text-sm">take a photo</span>
            </button>
          )}
        </div>

        {error && <p className="font-mono text-danger text-xs">{error}</p>}

        {/* Lock in button */}
        <button
          onClick={lockInSpot}
          disabled={saving || geo.loading || !!geo.error || !geo.lat}
          className="w-full h-16 bg-accent text-black text-2xl tracking-[0.08em] active:scale-[0.97] transition-transform disabled:bg-[#1a1a1a] disabled:text-[#2e2e2e] disabled:cursor-not-allowed"
          style={{ fontFamily: "'Bebas Neue', sans-serif" }}
        >
          {saving ? 'LOCKING IN...' : 'LOCK IN SPOT'}
        </button>
      </div>

      {/* Success overlay */}
      <AnimatePresence>
        {saved && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-bg flex flex-col items-center justify-center z-50 gap-6"
          >
            {savedEmojis ? (
              <>
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  className="text-6xl tracking-widest"
                >
                  {savedEmojis.join('  ')}
                </motion.div>
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.1 }}
                >
                  <h1
                    className="text-[72px] text-accent text-center leading-none"
                    style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}
                  >
                    LOCKED.
                  </h1>
                  <div className="h-1 w-full bg-accent mt-2" />
                </motion.div>
              </>
            ) : (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                <h1
                  className="text-[80px] text-accent text-center leading-none"
                  style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}
                >
                  LOCKED.
                </h1>
                <div className="h-1 w-full bg-accent mt-2" />
              </motion.div>
            )}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.3, 0] }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-accent pointer-events-none"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
