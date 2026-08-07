export type Manager = {
  id: string
  name: string
  rating: number
  reviews: number
  experienceYears: number
  specialties: string[]
  distanceKm: number
  bio: string
  color: string
  online?: boolean
  region?: string | null
}
