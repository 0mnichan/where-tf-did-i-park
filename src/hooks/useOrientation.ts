import { useState, useEffect, useRef } from 'react'

export interface OrientationState {
  heading: number | null
  pitch: number | null
  smoothedHeading: number | null
  available: boolean
}

export function useOrientation(active = true) {
  const [state, setState] = useState<OrientationState>({
    heading: null,
    pitch: null,
    smoothedHeading: null,
    available: false,
  })
  const smoothed = useRef<number | null>(null)
  // Once we get a true-north fix, never fall back to relative alpha
  const trueNorthAcquired = useRef(false)

  useEffect(() => {
    if (!active) return

    function process(raw: number, pitch: number | null, isTrueNorth: boolean) {
      if (isTrueNorth) trueNorthAcquired.current = true
      if (trueNorthAcquired.current && !isTrueNorth) return

      let newSmoothed: number
      if (smoothed.current === null) {
        newSmoothed = raw
      } else {
        let delta = raw - smoothed.current
        if (delta > 180) delta -= 360
        if (delta < -180) delta += 360
        newSmoothed = (smoothed.current + 0.15 * delta + 360) % 360
      }
      smoothed.current = newSmoothed

      setState({
        heading: raw,
        pitch,
        smoothedHeading: newSmoothed,
        available: trueNorthAcquired.current,
      })
    }

    // Android: deviceorientationabsolute alpha increases counterclockwise — convert to CW
    function onAbsolute(e: DeviceOrientationEvent) {
      if (e.alpha == null) return
      process((360 - e.alpha) % 360, e.beta, true)
    }

    // iOS: webkitCompassHeading is clockwise from true north
    // Android fallback: relative alpha (not useful for compass, marks available=false)
    function onRelative(e: DeviceOrientationEvent) {
      const iosHeading = (e as any).webkitCompassHeading as number | undefined
      if (iosHeading != null) {
        process(iosHeading, e.beta, true)
      } else {
        process(e.alpha ?? 0, e.beta, false)
      }
    }

    window.addEventListener('deviceorientationabsolute', onAbsolute as EventListener, true)
    window.addEventListener('deviceorientation', onRelative as EventListener, true)

    return () => {
      window.removeEventListener('deviceorientationabsolute', onAbsolute as EventListener, true)
      window.removeEventListener('deviceorientation', onRelative as EventListener, true)
    }
  }, [active])

  return state
}
