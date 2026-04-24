export interface VehicleProfile {
  id: string
  user_id: string
  make: string
  color: string
  plate: string
}

export interface SavedSpot {
  id: string
  user_id: string
  lat: number
  lng: number
  accuracy: number
  heading: number | null
  pitch: number | null
  photo_url: string | null
  saved_at: string
  is_active: boolean
  digipin: string | null
  emoji_code: string | null
  auto_clear_at: string | null
}

export interface User {
  id: string
  email: string
}

export type View = 'auth' | 'setup' | 'home' | 'save' | 'find'
