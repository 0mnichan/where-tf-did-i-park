import { useEffect, useRef, useState } from 'react'
import { calculateBearing, haversineDistance } from '../utils/geo'

interface ARCanvasProps {
  currentLat: number
  currentLng: number
  savedLat: number
  savedLng: number
  compassHeading: number | null
  compassAvailable: boolean
}

export default function ARCanvas({
  currentLat,
  currentLng,
  savedLat,
  savedLng,
  compassHeading,
  compassAvailable,
}: ARCanvasProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const [cameraAvailable, setCameraAvailable] = useState(true)
  const [cameraError, setCameraError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        })
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        setCameraAvailable(true)
      } catch {
        if (!cancelled) {
          setCameraAvailable(false)
          setCameraError('camera unavailable — text mode')
        }
      }
    }

    startCamera()

    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    function draw() {
      rafRef.current = requestAnimationFrame(draw)
      const ctx = canvas!.getContext('2d')
      if (!ctx) return

      const W = canvas!.width
      const H = canvas!.height
      ctx.clearRect(0, 0, W, H)

      const distance = haversineDistance(currentLat, currentLng, savedLat, savedLng)
      const isClose = distance < 10
      const bearing = calculateBearing(currentLat, currentLng, savedLat, savedLng)
      const heading = compassHeading ?? 0

      const relativeBearing = (bearing - heading + 360) % 360
      const normalizedOffset = relativeBearing > 180 ? relativeBearing - 360 : relativeBearing

      const accentColor = isClose ? '#ffc832' : '#c8f542'
      const pulse = (Math.sin(Date.now() / (isClose ? 150 : 300)) + 1) / 2
      const circleRadius = 9 + pulse * 9

      // Always draw PUBG compass strip at top
      drawCompass(ctx, W, heading, bearing, accentColor, compassAvailable)

      // Beacon: show when facing within 45° of target, or when compass unavailable (centered)
      if (!compassAvailable || Math.abs(normalizedOffset) < 45) {
        const xPos = compassAvailable
          ? W / 2 + (normalizedOffset / 45) * (W / 2)
          : W / 2
        drawBeacon(ctx, xPos, H, accentColor, circleRadius)
        drawDistanceText(ctx, xPos, H, distance, accentColor, circleRadius)

        if (isClose) {
          ctx.save()
          ctx.textAlign = 'center'
          ctx.fillStyle = '#ffc832'
          ctx.shadowBlur = 24
          ctx.shadowColor = '#ffc832'
          ctx.font = "48px 'Bebas Neue', sans-serif"
          ctx.fillText("YOU'RE HERE", W / 2, H / 2)
          ctx.restore()
        }
      }

      // Compass unavailable notice at bottom
      if (!compassAvailable) {
        ctx.save()
        ctx.fillStyle = 'rgba(0,0,0,0.6)'
        ctx.fillRect(0, H - 40, W, 40)
        ctx.fillStyle = '#ffc832'
        ctx.font = "11px 'Space Mono', monospace"
        ctx.textAlign = 'center'
        ctx.fillText('compass unavailable — rotate phone slowly to scan', W / 2, H - 14)
        ctx.restore()
      }
    }

    rafRef.current = requestAnimationFrame(draw)

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [currentLat, currentLng, savedLat, savedLng, compassHeading, compassAvailable])

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {cameraAvailable ? (
        <video
          ref={videoRef}
          muted
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-end justify-center pb-4">
          <span className="text-muted font-mono text-xs">{cameraError}</span>
        </div>
      )}
      <canvas
        ref={canvasRef}
        width={390}
        height={400}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
    </div>
  )
}

// ─── PUBG-style compass strip ──────────────────────────────────────────────

const CARDINAL: Record<number, string> = {
  0: 'N', 45: 'NE', 90: 'E', 135: 'SE',
  180: 'S', 225: 'SW', 270: 'W', 315: 'NW',
}

function drawCompass(
  ctx: CanvasRenderingContext2D,
  W: number,
  heading: number,
  targetBearing: number,
  accentColor: string,
  compassAvailable: boolean,
) {
  const CY = 64         // center of tick row
  const HALF = 15       // half-height of tallest tick
  const RANGE = 45      // degrees visible each side of center

  ctx.save()

  // Background strip
  ctx.fillStyle = 'rgba(0,0,0,0.68)'
  ctx.fillRect(0, 0, W, CY + HALF + 22)

  // Degree ticks + cardinal labels
  for (let d = 0; d < 360; d += 5) {
    let rel = d - heading
    if (rel > 180) rel -= 360
    if (rel < -180) rel += 360
    if (Math.abs(rel) > RANGE + 3) continue

    const x = W / 2 + (rel / RANGE) * (W / 2)
    const isCard = d % 90 === 0
    const isInterCard = d % 45 === 0
    const isMajor15 = d % 15 === 0

    if (!isMajor15) continue

    const tickH = isCard ? HALF : isInterCard ? HALF - 5 : HALF - 9
    ctx.beginPath()
    ctx.moveTo(x, CY - tickH)
    ctx.lineTo(x, CY + tickH)
    ctx.strokeStyle = isCard ? '#ffffff' : 'rgba(255,255,255,0.38)'
    ctx.lineWidth = isCard ? 2 : 1
    ctx.shadowBlur = 0
    ctx.stroke()

    if (isInterCard) {
      const label = CARDINAL[d]
      if (label) {
        ctx.fillStyle = isCard ? '#ffffff' : 'rgba(255,255,255,0.6)'
        ctx.font = `${isCard ? 13 : 11}px 'Space Mono', monospace`
        ctx.textAlign = 'center'
        ctx.fillText(label, x, CY - HALF - 5)
      }
    }
  }

  // Target bearing indicator
  if (compassAvailable) {
    let relTarget = targetBearing - heading
    if (relTarget > 180) relTarget -= 360
    if (relTarget < -180) relTarget += 360

    ctx.shadowBlur = 14
    ctx.shadowColor = accentColor
    ctx.fillStyle = accentColor

    if (Math.abs(relTarget) <= RANGE - 1) {
      // Downward-pointing triangle hanging below tick line
      const tx = W / 2 + (relTarget / RANGE) * (W / 2)
      ctx.beginPath()
      ctx.moveTo(tx, CY + HALF + 16)
      ctx.lineTo(tx - 9, CY + HALF + 2)
      ctx.lineTo(tx + 9, CY + HALF + 2)
      ctx.closePath()
      ctx.fill()
    } else {
      // Off-compass edge arrow + degree label
      const isLeft = relTarget < 0
      const ex = isLeft ? 18 : W - 18
      ctx.beginPath()
      if (isLeft) {
        ctx.moveTo(ex, CY)
        ctx.lineTo(ex + 15, CY - 9)
        ctx.lineTo(ex + 15, CY + 9)
      } else {
        ctx.moveTo(ex, CY)
        ctx.lineTo(ex - 15, CY - 9)
        ctx.lineTo(ex - 15, CY + 9)
      }
      ctx.closePath()
      ctx.fill()

      ctx.shadowBlur = 6
      ctx.font = "11px 'Space Mono', monospace"
      ctx.textAlign = isLeft ? 'left' : 'right'
      ctx.fillText(
        `${Math.round(Math.abs(relTarget))}°`,
        isLeft ? ex + 19 : ex - 19,
        CY + 4,
      )
    }
  }

  // Center hairline (your current heading)
  ctx.shadowBlur = 0
  ctx.beginPath()
  ctx.moveTo(W / 2, 0)
  ctx.lineTo(W / 2, CY + HALF + 22)
  ctx.strokeStyle = 'rgba(255,255,255,0.88)'
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.restore()
}

// ─── Pokemon Go / AR beacon ────────────────────────────────────────────────

function drawBeacon(
  ctx: CanvasRenderingContext2D,
  x: number,
  H: number,
  color: string,
  circleRadius: number,
) {
  ctx.save()

  // Wide diffuse halo
  ctx.beginPath()
  ctx.moveTo(x, H)
  ctx.lineTo(x, 0)
  ctx.strokeStyle = hexToRgba(color, 0.07)
  ctx.lineWidth = 38
  ctx.stroke()

  // Mid halo
  ctx.beginPath()
  ctx.moveTo(x, H)
  ctx.lineTo(x, 0)
  ctx.strokeStyle = hexToRgba(color, 0.16)
  ctx.lineWidth = 13
  ctx.stroke()

  // Main beam with gradient (bright at base, fades to top)
  const grad = ctx.createLinearGradient(x, H, x, 0)
  grad.addColorStop(0, hexToRgba(color, 1))
  grad.addColorStop(0.2, hexToRgba(color, 0.85))
  grad.addColorStop(1, hexToRgba(color, 0))
  ctx.shadowBlur = 30
  ctx.shadowColor = color
  ctx.beginPath()
  ctx.moveTo(x, H)
  ctx.lineTo(x, 0)
  ctx.strokeStyle = grad
  ctx.lineWidth = 4
  ctx.stroke()

  // Pokemon Go expanding rings at base
  const t = Date.now() / 1000
  for (let i = 0; i < 3; i++) {
    const phase = (t * 0.75 + i * 0.333) % 1
    const ringR = 8 + phase * 58
    const alpha = (1 - phase) * 0.55
    ctx.beginPath()
    ctx.arc(x, H - 24, ringR, 0, Math.PI * 2)
    ctx.strokeStyle = hexToRgba(color, alpha)
    ctx.lineWidth = 2.5
    ctx.shadowBlur = 12
    ctx.shadowColor = color
    ctx.stroke()
  }

  // Core pulsing dot
  ctx.shadowBlur = 24
  ctx.shadowColor = color
  ctx.beginPath()
  ctx.arc(x, H - 24, circleRadius, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()

  ctx.restore()
}

function drawDistanceText(
  ctx: CanvasRenderingContext2D,
  x: number,
  H: number,
  distance: number,
  color: string,
  circleRadius: number,
) {
  ctx.save()
  ctx.textAlign = 'center'
  ctx.fillStyle = color
  ctx.font = "14px 'Space Mono', monospace"
  ctx.shadowBlur = 8
  ctx.shadowColor = color
  ctx.fillText(`~${Math.round(distance)}m`, x, H - 24 - circleRadius - 16)
  ctx.restore()
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}
