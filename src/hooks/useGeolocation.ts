import { useState, useEffect, useRef } from 'react'

export interface GeoState {
  lat: number | null
  lng: number | null
  accuracy: number | null
  error: string | null
  loading: boolean
}

export function useGeolocation(active = true) {
  const [state, setState] = useState<GeoState>({
    lat: null,
    lng: null,
    accuracy: null,
    error: null,
    loading: true,
  })
  const watchId = useRef<number | null>(null)

  useEffect(() => {
    if (!active) return

    if (!navigator.geolocation) {
      setState(s => ({ ...s, error: 'Geolocation is not supported by your browser.', loading: false }))
      return
    }

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        setState({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          error: null,
          loading: false,
        })
      },
      (err) => {
        let message = 'Location unavailable.'
        if (err.code === err.PERMISSION_DENIED) {
          message = 'Location permission denied. Enable it in your browser settings.'
        } else if (err.code === err.TIMEOUT) {
          message = 'Location request timed out. Try again.'
        }
        setState(s => ({ ...s, error: message, loading: false }))
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current)
        watchId.current = null
      }
    }
  }, [active])

  return state
}
