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
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }
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
      let relativeBearing = (bearing - heading + 360) % 360
      const normalizedOffset = relativeBearing > 180 ? relativeBearing - 360 : relativeBearing

      const accentColor = isClose ? '#ffc832' : '#c8f542'
      const accentGlow = isClose ? '#ffc832' : '#c8f542'

      const pulse = (Math.sin(Date.now() / (isClose ? 150 : 300)) + 1) / 2
      const circleRadius = 8 + pulse * 8

      if (!compassAvailable) {
        // Beacon stays centered when compass unavailable
        drawBeam(ctx, W / 2, W, H, accentColor, accentGlow, circleRadius)
        drawDistanceText(ctx, W / 2, H, distance, accentColor)

        ctx.fillStyle = 'rgba(0,0,0,0.6)'
        ctx.fillRect(0, 0, W, 40)
        ctx.fillStyle = '#ffc832'
        ctx.font = "12px 'Space Mono', monospace"
        ctx.textAlign = 'center'
        ctx.fillText('compass unavailable — rotate your phone slowly to scan', W / 2, 26)
      } else if (Math.abs(normalizedOffset) < 30) {
        const xPos = W / 2 + (normalizedOffset / 30) * (W / 2)
        drawBeam(ctx, xPos, W, H, accentColor, accentGlow, circleRadius)
        drawDistanceText(ctx, xPos, H, distance, accentColor)

        if (isClose) {
          ctx.save()
          ctx.textAlign = 'center'
          ctx.fillStyle = '#ffc832'
          ctx.shadowBlur = 20
          ctx.shadowColor = '#ffc832'
          ctx.font = "48px 'Bebas Neue', sans-serif"
          ctx.fillText("YOU'RE HERE", W / 2, H / 2)
          ctx.restore()
        }
      } else {
        // Off-screen directional arrow
        const isLeft = normalizedOffset < 0
        const arrowX = isLeft ? 48 : W - 48
        const arrowY = H / 2

        const arrowPulse = 0.6 + pulse * 0.4
        ctx.globalAlpha = arrowPulse

        ctx.save()
        ctx.strokeStyle = accentColor
        ctx.fillStyle = accentColor
        ctx.shadowBlur = 16
        ctx.shadowColor = accentGlow
        ctx.lineWidth = 3

        // Draw arrow pointing inward
        const dir = isLeft ? 1 : -1
        ctx.beginPath()
        ctx.moveTo(arrowX + dir * -20, arrowY - 30)
        ctx.lineTo(arrowX + dir * 20, arrowY)
        ctx.lineTo(arrowX + dir * -20, arrowY + 30)
        ctx.stroke()

        ctx.restore()
        ctx.globalAlpha = 1

        ctx.save()
        ctx.textAlign = 'center'
        ctx.fillStyle = accentColor
        ctx.shadowBlur = 8
        ctx.shadowColor = accentGlow
        ctx.font = "14px 'Space Mono', monospace"
        ctx.fillText(isLeft ? 'turn left' : 'turn right', arrowX, arrowY + 54)
        ctx.restore()
      }
    }

    rafRef.current = requestAnimationFrame(draw)

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
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

function drawBeam(
  ctx: CanvasRenderingContext2D,
  x: number,
  W: number,
  H: number,
  color: string,
  glowColor: string,
  circleRadius: number
) {
  ctx.save()

  // Halo/bloom — wide, very low opacity
  ctx.shadowBlur = 0
  const haloGrad = ctx.createLinearGradient(x, H, x, 0)
  haloGrad.addColorStop(0, color.replace(')', ', 0.15)').replace('rgb', 'rgba').replace('#', 'rgba(') || 'rgba(200,245,66,0.15)')
  haloGrad.addColorStop(1, 'rgba(0,0,0,0)')

  // Draw wide halo line
  ctx.beginPath()
  ctx.moveTo(x, H)
  ctx.lineTo(x, 0)
  ctx.strokeStyle = hexToRgba(color, 0.12)
  ctx.lineWidth = 20
  ctx.stroke()

  // Main beam
  const grad = ctx.createLinearGradient(x, H, x, 0)
  grad.addColorStop(0, hexToRgba(color, 1))
  grad.addColorStop(1, hexToRgba(color, 0))

  ctx.shadowBlur = 24
  ctx.shadowColor = glowColor
  ctx.beginPath()
  ctx.moveTo(x, H)
  ctx.lineTo(x, 0)
  ctx.strokeStyle = grad
  ctx.lineWidth = 3
  ctx.stroke()

  // Pulsing origin circle
  ctx.shadowBlur = 20
  ctx.shadowColor = glowColor
  ctx.beginPath()
  ctx.arc(x, H - 20, circleRadius, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()

  ctx.restore()

  // Distance drawn separately (no shadow propagation)
  void W
}

function drawDistanceText(
  ctx: CanvasRenderingContext2D,
  x: number,
  H: number,
  distance: number,
  color: string
) {
  const textY = H - 20 - 28
  ctx.save()
  ctx.textAlign = 'center'
  ctx.fillStyle = color
  ctx.font = "14px 'Space Mono', monospace"
  ctx.shadowBlur = 8
  ctx.shadowColor = color
  ctx.fillText(`~${Math.round(distance)}m`, x, textY)
  ctx.restore()
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}
