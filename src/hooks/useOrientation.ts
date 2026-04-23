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

  useEffect(() => {
    if (!active) return

    function handler(e: DeviceOrientationEvent) {
      const raw = e.alpha
      const pitch = e.beta

      if (raw === null) return

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
        pitch: pitch,
        smoothedHeading: newSmoothed,
        available: true,
      })
    }

    window.addEventListener('deviceorientation', handler as EventListener, true)
    return () => window.removeEventListener('deviceorientation', handler as EventListener, true)
  }, [active])

  return state
}
