import { useEffect, useRef, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, X, Share2, Copy } from 'lucide-react'
import { MapContainer, TileLayer, Polyline, Rectangle, useMap } from 'react-leaflet'
import L from 'leaflet'
import { useGeolocation } from '../hooks/useGeolocation'
import { haversineDistance } from '../utils/geo'
import { headingToCardinal } from '../utils/geo'
import { colorNameToHex } from '../utils/colorMap'
import { encodeDIGIPIN, decodeDIGIPIN } from '../utils/digipin'
import { isSameZone } from '../utils/emojiCode'
import { supabase } from '../lib/supabase'
import { SIGNED_URL_EXPIRY_SECONDS } from '../constants'
import { VehicleProfile, SavedSpot } from '../types'
import PermissionError from '../components/PermissionError'

interface FindScreenProps {
  vehicle: VehicleProfile
  activeSpot: SavedSpot
  onBack: () => void
}

const DIGIPIN_CELL_DELTA = 0.00002

// Sub-component: auto-fits map to show both markers
function MapFitter({ positions }: { positions: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (positions.length < 2) return
    const bounds = L.latLngBounds(positions.map(p => L.latLng(p[0], p[1])))
    map.fitBounds(bounds, { padding: [60, 60] })
  }, [map, positions])
  return null
}

// Sub-component: marker using DivIcon
function DivMarker({ position, html }: { position: [number, number]; html: string }) {
  const map = useMap()
  useEffect(() => {
    const icon = L.divIcon({ html, className: '', iconAnchor: [0, 0] })
    const marker = L.marker(position, { icon }).addTo(map)
    return () => { marker.remove() }
  }, [map, position, html])
  return null
}

export default function FindScreen({ vehicle, activeSpot, onBack }: FindScreenProps) {
  const geo = useGeolocation()
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const [photoModal, setPhotoModal] = useState(false)
  const [copiedDigipin, setCopiedDigipin] = useState(false)
  const [signedPhotoUrl, setSignedPhotoUrl] = useState<string | null>(null)

  const dotColor = colorNameToHex(vehicle.color)

  const savedEmojis: [string, string, string] | null = useMemo(() => {
    if (!activeSpot.emoji_code) return null
    try { return JSON.parse(activeSpot.emoji_code) } catch { return null }
  }, [activeSpot.emoji_code])

  // Generate signed URL for photo if stored as a path
  useEffect(() => {
    if (!activeSpot.photo_url) return
    if (activeSpot.photo_url.startsWith('http')) {
      setSignedPhotoUrl(activeSpot.photo_url)
      return
    }
    supabase.storage
      .from('parking-photos')
      .createSignedUrl(activeSpot.photo_url, SIGNED_URL_EXPIRY_SECONDS)
      .then(({ data }) => { if (data) setSignedPhotoUrl(data.signedUrl) })
  }, [activeSpot.photo_url])

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
    return () => { wakeLockRef.current?.release().catch(() => {}); wakeLockRef.current = null }
  }, [])

  const currentLat = geo.lat ?? activeSpot.lat
  const currentLng = geo.lng ?? activeSpot.lng
  const distance = haversineDistance(currentLat, currentLng, activeSpot.lat, activeSpot.lng)

  const currentDIGIPIN = useMemo(() => {
    if (!geo.lat || !geo.lng) return null
    try { return encodeDIGIPIN(geo.lat, geo.lng) } catch { return null }
  }, [geo.lat, geo.lng])

  const arrived = useMemo(() => {
    if (!currentDIGIPIN || !activeSpot.digipin) return distance < 10
    return isSameZone(currentDIGIPIN, activeSpot.digipin)
  }, [currentDIGIPIN, activeSpot.digipin, distance])

  useEffect(() => {
    if (arrived) {
      try { navigator.vibrate([200, 100, 200]) } catch { /* not supported */ }
    }
  }, [arrived])

  const mapHeight = Math.round(window.innerHeight * 0.6)

  const spotPos: [number, number] = [activeSpot.lat, activeSpot.lng]
  const currentPos: [number, number] = [currentLat, currentLng]

  const digiPinCellBounds: [[number, number], [number, number]] | null = useMemo(() => {
    if (!activeSpot.digipin) return null
    try {
      const center = decodeDIGIPIN(activeSpot.digipin)
      return [
        [center.lat - DIGIPIN_CELL_DELTA, center.lng - DIGIPIN_CELL_DELTA],
        [center.lat + DIGIPIN_CELL_DELTA, center.lng + DIGIPIN_CELL_DELTA],
      ]
    } catch { return null }
  }, [activeSpot.digipin])

  const spotMarkerHtml = savedEmojis
    ? `<div class="spot-marker-wrap"><div class="spot-marker-emojis">${savedEmojis.join(' ')}</div><div class="spot-marker-pin"></div></div>`
    : `<div class="spot-marker-wrap"><div class="spot-marker-pin" style="width:14px;height:14px;"></div></div>`

  const currentMarkerHtml = `<div class="current-location-dot"></div>`

  function handleCopyDigipin() {
    if (!activeSpot.digipin) return
    navigator.clipboard.writeText(activeSpot.digipin).then(() => {
      setCopiedDigipin(true)
      setTimeout(() => setCopiedDigipin(false), 1500)
    })
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

  if (geo.error && geo.error.includes('denied')) {
    return <PermissionError
      title="NO GPS"
      message="Location permission denied. Enable it in your browser settings to find your vehicle."
      onBack={onBack}
    />
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="h-screen bg-bg flex flex-col overflow-hidden"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Map */}
      <div className="relative" style={{ height: mapHeight, flexShrink: 0 }}>
        <MapContainer
          center={spotPos}
          zoom={18}
          style={{ width: '100%', height: '100%' }}
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapFitter positions={[spotPos, currentPos]} />
          <DivMarker position={spotPos} html={spotMarkerHtml} />
          <DivMarker position={currentPos} html={currentMarkerHtml} />
          <Polyline
            positions={[currentPos, spotPos]}
            pathOptions={{ color: '#c8f542', weight: 2, dashArray: '6 6', opacity: 0.8 }}
          />
          {digiPinCellBounds && (
            <Rectangle
              bounds={digiPinCellBounds}
              pathOptions={{ color: '#c8f542', weight: 2, fillColor: '#c8f542', fillOpacity: 0.08 }}
            />
          )}
        </MapContainer>

        {/* Back button */}
        <button
          onClick={onBack}
          className="absolute top-3 left-3 flex items-center gap-1 px-3 py-2 bg-black/60 text-[#f0f0f0] active:scale-[0.97] transition-transform z-[1000]"
        >
          <ChevronLeft size={16} />
          <span className="font-mono text-sm">back</span>
        </button>

        {/* GPS loading badge */}
        {geo.loading && (
          <div className="absolute bottom-3 left-3 right-3 bg-black/70 px-3 py-2 flex items-center gap-2 z-[1000]">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="font-mono text-[#f0f0f0] text-xs">acquiring GPS...</span>
          </div>
        )}

        {/* YOU'RE HERE overlay */}
        <AnimatePresence>
          {arrived && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-0 flex flex-col items-center justify-center z-[1000] bg-black/50"
            >
              {savedEmojis && (
                <motion.div
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                  className="text-5xl mb-4"
                >
                  {savedEmojis.join('  ')}
                </motion.div>
              )}
              <h1
                className="text-[64px] leading-none"
                style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  color: '#ffc832',
                  textShadow: '0 0 24px #ffc832',
                  letterSpacing: '0.05em',
                }}
              >
                YOU'RE HERE
              </h1>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Info panel */}
      <div className="flex-1 bg-surface border-t border-border overflow-y-auto">
        <div className="px-5 py-4 flex flex-col gap-4">

          {/* Emoji code hero */}
          {savedEmojis && (
            <div className="flex flex-col items-center gap-1 py-2">
              <div className="text-5xl tracking-widest">{savedEmojis.join('  ')}</div>
              {activeSpot.digipin && (
                <button
                  onClick={handleCopyDigipin}
                  className="flex items-center gap-2 mt-1 active:scale-[0.97] transition-transform"
                >
                  <span className="font-mono text-accent text-base tracking-widest">
                    {activeSpot.digipin}
                  </span>
                  {copiedDigipin
                    ? <span className="font-mono text-muted text-xs">copied!</span>
                    : <Copy size={13} className="text-muted" />
                  }
                </button>
              )}
            </div>
          )}

          {/* Vehicle strip */}
          <div className="flex items-center gap-3 py-2 border-t border-border">
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

          {/* Distance */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-accent2 text-sm">
              ~{Math.round(distance)}m away
            </span>
            <span className="font-mono text-muted text-xs">•</span>
            <span className="font-mono text-muted text-xs">
              saved with ±{Math.round(activeSpot.accuracy)}m accuracy
            </span>
          </div>

          {/* Orientation hint */}
          {activeSpot.heading !== null && (
            <p className="font-mono text-[#f0f0f0] text-xs">
              you were facing{' '}
              <span className="text-accent">{headingToCardinal(activeSpot.heading)}</span>{' '}
              when you parked
            </p>
          )}

          {/* Saved photo */}
          {signedPhotoUrl ? (
            <div>
              <button
                onClick={() => setPhotoModal(true)}
                className="w-full overflow-hidden active:opacity-80 transition-opacity"
              >
                <img
                  src={signedPhotoUrl}
                  alt="what it looked like when you parked"
                  className="w-full h-28 object-cover"
                />
              </button>
              <p className="font-mono text-muted text-xs mt-1">tap to expand</p>
            </div>
          ) : !activeSpot.photo_url ? (
            <p className="font-mono text-muted text-xs">
              no photo taken — hope you remember where you parked lol
            </p>
          ) : null}

          {/* Share button */}
          <button
            onClick={handleShare}
            className="flex items-center justify-center gap-2 w-full h-12 border border-border text-muted active:border-accent active:text-accent transition-colors"
          >
            <Share2 size={16} />
            <span className="font-mono text-sm">share my spot</span>
          </button>
        </div>
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
            <button className="absolute top-4 right-4 text-[#f0f0f0] p-2" onClick={() => setPhotoModal(false)}>
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
    </motion.div>
  )
}
