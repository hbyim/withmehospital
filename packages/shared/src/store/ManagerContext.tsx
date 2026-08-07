import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api } from '../api/client'
import type { Manager } from '../data/managers'
import { useAuth } from './AuthContext'
import { useBooking } from './BookingContext'

type ManagerSession = {
  managerId: string
  online: boolean
  declinedIds: string[]
}

type ManagerContextValue = {
  manager: Manager
  session: ManagerSession
  setOnline: (online: boolean) => Promise<void>
  switchManager: (id: string) => void
  declineRequest: (bookingId: string) => Promise<void>
  isDeclined: (bookingId: string) => boolean
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
  const [declinedIds, setDeclinedIds] = useState<string[]>([])

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

  const declineRequest = useCallback(
    async (bookingId: string) => {
      await declineBooking(bookingId)
      setDeclinedIds((prev) =>
        prev.includes(bookingId) ? prev : [...prev, bookingId],
      )
    },
    [declineBooking],
  )

  const value = useMemo<ManagerContextValue>(
    () => ({
      manager,
      session: {
        managerId: manager.id,
        online: Boolean(manager.online ?? true),
        declinedIds,
      },
      setOnline,
      switchManager: () => {
        // 상용: 계정 전환은 로그아웃 후 다른 매니저로 로그인
      },
      declineRequest,
      isDeclined: (bookingId: string) => declinedIds.includes(bookingId),
    }),
    [manager, declinedIds, setOnline, declineRequest],
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
