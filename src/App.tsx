import { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { supabase } from './lib/supabase'
import { User, VehicleProfile, SavedSpot, View } from './types'
import AuthScreen from './screens/AuthScreen'
import SetupScreen from './screens/SetupScreen'
import HomeScreen from './screens/HomeScreen'
import SaveScreen from './screens/SaveScreen'
import FindScreen from './screens/FindScreen'

function DesktopGuard({ children }: { children: React.ReactNode }) {
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    function check() {
      setIsDesktop(window.innerWidth > 768 && !('ontouchstart' in window))
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  if (isDesktop) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <h1
            className="text-[48px] text-[#f0f0f0] leading-none mb-2"
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}
          >
            oi
          </h1>
          <div className="h-[2px] bg-accent mb-6" />
          <p className="font-mono text-muted text-sm leading-relaxed">
            this is a mobile app. open it on your phone and add it to your home screen.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export default function App() {
  const [view, setView] = useState<View>('auth')
  const [user, setUser] = useState<User | null>(null)
  const [vehicle, setVehicle] = useState<VehicleProfile | null>(null)
  const [activeSpot, setActiveSpot] = useState<SavedSpot | null>(null)
  const [loading, setLoading] = useState(true)

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
        return
      }
      const u: User = { id: session.user.id, email: session.user.email ?? '' }
      setUser(u)
      loadUserData(u.id)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadUserData(userId: string) {
    const { data: vehicleData } = await supabase
      .from('vehicle_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (!vehicleData) {
      setVehicle(null)
      setView('setup')
      return
    }
    setVehicle(vehicleData as VehicleProfile)

    const { data: spotData } = await supabase
      .from('saved_spots')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('saved_at', { ascending: false })
      .limit(1)
      .single()

    setActiveSpot((spotData as SavedSpot) ?? null)
    setView('home')
  }

  async function refreshSpot(userId: string) {
    const { data } = await supabase
      .from('saved_spots')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('saved_at', { ascending: false })
      .limit(1)
      .single()
    setActiveSpot((data as SavedSpot) ?? null)
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
    <DesktopGuard>
      <div className="min-h-screen bg-bg overflow-x-hidden">
        <AnimatePresence mode="wait">
          {view === 'auth' && (
            <AuthScreen key="auth" />
          )}

          {view === 'setup' && user && (
            <SetupScreen
              key="setup"
              user={user}
              onComplete={() => {
                if (user) loadUserData(user.id)
              }}
            />
          )}

          {view === 'home' && user && vehicle && (
            <HomeScreen
              key="home"
              user={user}
              vehicle={vehicle}
              activeSpot={activeSpot}
              onSave={() => setView('save')}
              onFind={() => setView('find')}
              onSpotCleared={() => setActiveSpot(null)}
              onSignOut={() => {
                setUser(null)
                setVehicle(null)
                setActiveSpot(null)
                setView('auth')
              }}
            />
          )}

          {view === 'save' && user && (
            <SaveScreen
              key="save"
              user={user}
              onBack={() => setView('home')}
              onSaved={() => {
                if (user) refreshSpot(user.id).then(() => setView('home'))
              }}
            />
          )}

          {view === 'find' && vehicle && activeSpot && (
            <FindScreen
              key="find"
              vehicle={vehicle}
              activeSpot={activeSpot}
              onBack={() => setView('home')}
            />
          )}
        </AnimatePresence>
      </div>
    </DesktopGuard>
  )
}
