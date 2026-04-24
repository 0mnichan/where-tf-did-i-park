import { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { supabase } from './lib/supabase'
import { User, VehicleProfile, SavedSpot, View } from './types'
import AuthScreen from './screens/AuthScreen'
import SetupScreen from './screens/SetupScreen'
import HomeScreen from './screens/HomeScreen'
import SaveScreen from './screens/SaveScreen'
import FindScreen from './screens/FindScreen'
import ErrorBoundary from './components/ErrorBoundary'

const CACHE_SPOT_KEY = 'wtdip_cached_spot'
const CACHE_VEHICLE_KEY = 'wtdip_cached_vehicle'

function getCachedSpot(): SavedSpot | null {
  try { return JSON.parse(localStorage.getItem(CACHE_SPOT_KEY) ?? 'null') } catch { return null }
}
function getCachedVehicle(): VehicleProfile | null {
  try { return JSON.parse(localStorage.getItem(CACHE_VEHICLE_KEY) ?? 'null') } catch { return null }
}

export default function App() {
  const [view, setView] = useState<View>('auth')
  const [user, setUser] = useState<User | null>(null)
  const [vehicle, setVehicle] = useState<VehicleProfile | null>(null)
  const [activeSpot, setActiveSpot] = useState<SavedSpot | null>(null)
  const [loading, setLoading] = useState(true)
  const [dataError, setDataError] = useState('')
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setView('auth')
        setLoading(false)
        return
      }
      const u: User = { id: session.user.id, email: session.user.email ?? '' }
      setUser(u)
      loadUserData(u.id).finally(() => setLoading(false))
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setView('auth')
        setUser(null)
        setVehicle(null)
        setActiveSpot(null)
        localStorage.removeItem(CACHE_SPOT_KEY)
        localStorage.removeItem(CACHE_VEHICLE_KEY)
        return
      }
      const u: User = { id: session.user.id, email: session.user.email ?? '' }
      setUser(u)
      loadUserData(u.id)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadUserData(userId: string) {
    setDataError('')
    setOffline(false)

    try {
      const { data: vehicleData, error: vehicleErr } = await supabase
        .from('vehicle_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (vehicleErr && vehicleErr.code !== 'PGRST116') {
        // Not a "no rows" error — likely network failure, use cache
        const cached = getCachedVehicle()
        if (cached) {
          setVehicle(cached)
          setActiveSpot(getCachedSpot())
          setView('home')
          setOffline(true)
          return
        }
        setDataError('connection failed — check your network')
        setView('auth')
        return
      }

      if (!vehicleData) {
        setVehicle(null)
        setView('setup')
        return
      }
      setVehicle(vehicleData as VehicleProfile)
      localStorage.setItem(CACHE_VEHICLE_KEY, JSON.stringify(vehicleData))

      const { data: spotData, error: spotErr } = await supabase
        .from('saved_spots')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('saved_at', { ascending: false })
        .limit(1)
        .single()

      if (spotErr && spotErr.code !== 'PGRST116') {
        const cachedSpot = getCachedSpot()
        setActiveSpot(cachedSpot)
        if (cachedSpot) setOffline(true)
      } else {
        const spot = (spotData as SavedSpot) ?? null
        setActiveSpot(spot)
        if (spot) {
          localStorage.setItem(CACHE_SPOT_KEY, JSON.stringify(spot))
        } else {
          localStorage.removeItem(CACHE_SPOT_KEY)
        }
      }

      setView('home')
    } catch {
      const cachedVehicle = getCachedVehicle()
      if (cachedVehicle) {
        setVehicle(cachedVehicle)
        setActiveSpot(getCachedSpot())
        setView('home')
        setOffline(true)
      } else {
        setDataError('connection failed — check your network')
        setView('auth')
      }
    }
  }

  async function refreshSpot(userId: string) {
    try {
      const { data, error } = await supabase
        .from('saved_spots')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('saved_at', { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') {
        // Keep stale state on network error
        return
      }
      const spot = (data as SavedSpot) ?? null
      setActiveSpot(spot)
      if (spot) {
        localStorage.setItem(CACHE_SPOT_KEY, JSON.stringify(spot))
      } else {
        localStorage.removeItem(CACHE_SPOT_KEY)
      }
    } catch {
      // Keep stale state
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div
          className="w-3 h-3 rounded-full bg-accent"
          style={{ animation: 'pulse-ring 1.2s ease-in-out infinite' }}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg overflow-x-hidden">
      {offline && (
        <div className="bg-[#1a1a00] border-b border-[#ffc832]/30 px-4 py-2 text-center">
          <span className="font-mono text-[#ffc832] text-xs">using cached spot — you're offline</span>
        </div>
      )}
      {dataError && (
        <div className="bg-[#1a0000] border-b border-danger/30 px-4 py-2 text-center">
          <span className="font-mono text-danger text-xs">{dataError}</span>
        </div>
      )}

      <AnimatePresence mode="wait">
        {view === 'auth' && (
          <ErrorBoundary key="auth-boundary">
            <AuthScreen key="auth" />
          </ErrorBoundary>
        )}

        {view === 'setup' && user && (
          <ErrorBoundary key="setup-boundary">
            <SetupScreen
              key="setup"
              user={user}
              onComplete={() => {
                if (user) loadUserData(user.id)
              }}
            />
          </ErrorBoundary>
        )}

        {view === 'home' && user && vehicle && (
          <ErrorBoundary key="home-boundary">
            <HomeScreen
              key="home"
              user={user}
              vehicle={vehicle}
              activeSpot={activeSpot}
              onSave={() => setView('save')}
              onFind={() => setView('find')}
              onSpotCleared={() => {
                setActiveSpot(null)
                localStorage.removeItem(CACHE_SPOT_KEY)
              }}
              onSignOut={() => {
                setUser(null)
                setVehicle(null)
                setActiveSpot(null)
                setView('auth')
              }}
            />
          </ErrorBoundary>
        )}

        {view === 'save' && user && (
          <ErrorBoundary key="save-boundary">
            <SaveScreen
              key="save"
              user={user}
              onBack={() => setView('home')}
              onSaved={() => {
                if (user) refreshSpot(user.id).then(() => setView('home'))
              }}
            />
          </ErrorBoundary>
        )}

        {view === 'find' && vehicle && activeSpot && (
          <ErrorBoundary key="find-boundary">
            <FindScreen
              key="find"
              vehicle={vehicle}
              activeSpot={activeSpot}
              onBack={() => setView('home')}
            />
          </ErrorBoundary>
        )}
      </AnimatePresence>
    </div>
  )
}
