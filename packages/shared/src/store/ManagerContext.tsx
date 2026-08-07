import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react'
import { api } from '../api/client'
import type { Manager } from '../data/managers'
import { useAuth } from './AuthContext'
import { useBooking } from './BookingContext'

type ManagerSession = {
  managerId: string
  online: boolean
}

type ManagerContextValue = {
  manager: Manager
  session: ManagerSession
  setOnline: (online: boolean) => Promise<void>
  updateProfile: (input: {
    bio?: string
    region?: string
    specialties?: string[]
    experienceYears?: number
    online?: boolean
  }) => Promise<void>
  declineRequest: (bookingId: string) => Promise<void>
}

const ManagerContext = createContext<ManagerContextValue | null>(null)

const fallbackManager: Manager = {
  id: 'pending',
  name: '매니저',
  rating: 5,
  reviews: 0,
  experienceYears: 0,
  specialties: [],
  distanceKm: 0,
  bio: '',
  color: '#2F4F7A',
}

export function ManagerProvider({ children }: { children: ReactNode }) {
  const { manager: authManager, refreshMe } = useAuth()
  const { declineBooking } = useBooking()

  const manager = authManager ?? fallbackManager

  const setOnline = useCallback(
    async (online: boolean) => {
      await api('/api/managers/me', {
        method: 'PATCH',
        body: JSON.stringify({ online }),
      })
      await refreshMe()
    },
    [refreshMe],
  )

  const updateProfile = useCallback(
    async (input: {
      bio?: string
      region?: string
      specialties?: string[]
      experienceYears?: number
      online?: boolean
    }) => {
      await api('/api/managers/me', {
        method: 'PATCH',
        body: JSON.stringify(input),
      })
      await refreshMe()
    },
    [refreshMe],
  )

  const declineRequest = useCallback(
    async (bookingId: string) => {
      await declineBooking(bookingId)
    },
    [declineBooking],
  )

  const value = useMemo<ManagerContextValue>(
    () => ({
      manager,
      session: {
        managerId: manager.id,
        online: Boolean(manager.online ?? true),
      },
      setOnline,
      updateProfile,
      declineRequest,
    }),
    [manager, setOnline, updateProfile, declineRequest],
  )

  return (
    <ManagerContext.Provider value={value}>{children}</ManagerContext.Provider>
  )
}

export function useManager() {
  const ctx = useContext(ManagerContext)
  if (!ctx) throw new Error('useManager must be used within ManagerProvider')
  return ctx
}
