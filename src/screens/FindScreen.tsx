import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, X } from 'lucide-react'
import { useGeolocation } from '../hooks/useGeolocation'
import { useOrientation } from '../hooks/useOrientation'
import { haversineDistance } from '../utils/geo'
import { headingToCardinal } from '../utils/geo'
import { colorNameToHex } from '../utils/colorMap'
import { VehicleProfile, SavedSpot } from '../types'
import ARCanvas from '../components/ARCanvas'
import PermissionError from '../components/PermissionError'

interface FindScreenProps {
  vehicle: VehicleProfile
  activeSpot: SavedSpot
  onBack: () => void
}

export default function FindScreen({ vehicle, activeSpot, onBack }: FindScreenProps) {
  const geo = useGeolocation()
  const orientation = useOrientation()
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const [photoModal, setPhotoModal] = useState(false)

  useEffect(() => {
    async function acquireWakeLock() {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request('screen')
        }
      } catch {
        // Not supported or denied — silent
      }
    }
    acquireWakeLock()

    return () => {
      wakeLockRef.current?.release().catch(() => {})
      wakeLockRef.current = null
    }
  }, [])

  if (geo.error && geo.error.includes('denied')) {
    return <PermissionError
      title="NO GPS"
      message="Location permission denied. Enable it in your browser settings to find your vehicle."
      onBack={onBack}
    />
  }

  const currentLat = geo.lat ?? activeSpot.lat
  const currentLng = geo.lng ?? activeSpot.lng
  const distance = haversineDistance(currentLat, currentLng, activeSpot.lat, activeSpot.lng)
  const dotColor = colorNameToHex(vehicle.color)

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="h-screen bg-bg flex flex-col overflow-hidden"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* AR Camera View — 60vh */}
      <div className="relative flex-[6]">
        <ARCanvas
          currentLat={currentLat}
          currentLng={currentLng}
          savedLat={activeSpot.lat}
          savedLng={activeSpot.lng}
          compassHeading={orientation.smoothedHeading}
          compassAvailable={orientation.available}
        />

        {/* Back button floating over camera */}
        <button
          onClick={onBack}
          className="absolute top-3 left-3 flex items-center gap-1 px-3 py-2 bg-black/60 text-[#f0f0f0] active:scale-[0.97] transition-transform z-10"
        >
          <ChevronLeft size={16} />
          <span className="font-mono text-sm">back</span>
        </button>

        {/* GPS loading */}
        {geo.loading && (
          <div className="absolute bottom-3 left-3 right-3 bg-black/70 px-3 py-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="font-mono text-[#f0f0f0] text-xs">acquiring GPS...</span>
          </div>
        )}
      </div>

      {/* Info Panel — 40vh */}
      <div className="flex-[4] bg-surface border-t border-border overflow-y-auto">
        <div className="px-5 py-4 flex flex-col gap-4">
          {/* Vehicle strip */}
          <div className="flex items-center gap-3 py-2 border-b border-border">
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: dotColor, boxShadow: `0 0 6px ${dotColor}` }}
            />
            <span
              className="text-xl text-[#f0f0f0] tracking-widest"
              style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.1em' }}
            >
              {vehicle.make.toUpperCase()}&nbsp;&nbsp;{vehicle.color.toUpperCase()}&nbsp;&nbsp;#{vehicle.plate}
            </span>
          </div>

          {/* Saved photo */}
          {activeSpot.photo_url ? (
            <div>
              <button
                onClick={() => setPhotoModal(true)}
                className="w-full overflow-hidden active:opacity-80 transition-opacity"
              >
                <img
                  src={activeSpot.photo_url}
                  alt="what it looked like when you parked"
                  className="w-full h-28 object-cover"
                />
              </button>
              <p className="font-mono text-muted text-xs mt-1">what it looked like when you parked</p>
            </div>
          ) : (
            <p className="font-mono text-muted text-xs">
              no photo taken — hope you remember where you parked lol
            </p>
          )}

          {/* Orientation hint */}
          {activeSpot.heading !== null && (
            <p className="font-mono text-[#f0f0f0] text-xs">
              you were facing{' '}
              <span className="text-accent">{headingToCardinal(activeSpot.heading)}</span>{' '}
              when you parked
            </p>
          )}

          {/* Distance + accuracy */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-accent2 text-sm">
              ~{Math.round(distance)}m away
            </span>
            <span className="font-mono text-muted text-xs">•</span>
            <span className="font-mono text-muted text-xs">
              saved with ±{Math.round(activeSpot.accuracy)}m accuracy
            </span>
          </div>
        </div>
      </div>

      {/* Photo modal */}
      <AnimatePresence>
        {photoModal && activeSpot.photo_url && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
            onClick={() => setPhotoModal(false)}
          >
            <button className="absolute top-4 right-4 text-[#f0f0f0] p-2" onClick={() => setPhotoModal(false)}>
              <X size={24} />
            </button>
            <img
              src={activeSpot.photo_url}
              alt="parking spot"
              className="max-w-full max-h-full object-contain"
              onClick={e => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
