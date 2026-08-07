import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api } from '../api/client'
import type { Manager } from '../data/managers'
import type { ServiceItem } from '../data/services'
import { useAuth } from './AuthContext'

export type BookingStatus =
  | 'draft'
  | 'matching'
  | 'matched'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

export type Booking = {
  id: string
  service: ServiceItem
  date: string
  time: string
  durationHours: number
  pickup: string
  destination: string
  careTarget: string
  note: string
  price: number
  status: BookingStatus
  paymentStatus?: 'unpaid' | 'pending' | 'paid' | 'refunded'
  manager?: Manager
  customerName?: string
  createdAt: string
  acceptedAt?: string
}

type BookingDraft = {
  service?: ServiceItem
  date: string
  time: string
  durationHours: number
  pickup: string
  destination: string
  careTarget: string
  note: string
}

type BookingContextValue = {
  draft: BookingDraft
  setDraft: (patch: Partial<BookingDraft>) => void
  resetDraft: () => void
  bookings: Booking[]
  loading: boolean
  error: string | null
  refreshBookings: (scope?: 'open' | 'mine' | 'all') => Promise<void>
  createBooking: () => Promise<Booking | null>
  updateBooking: (
    id: string,
    patch: Partial<Booking> & { status?: BookingStatus },
  ) => Promise<void>
  acceptBooking: (id: string, _manager?: Manager) => Promise<boolean>
  declineBooking: (id: string) => Promise<void>
  matchManager: (id: string) => Promise<Manager>
  openRequests: Booking[]
}

const defaultDraft = (): BookingDraft => {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const yyyy = tomorrow.getFullYear()
  const mm = String(tomorrow.getMonth() + 1).padStart(2, '0')
  const dd = String(tomorrow.getDate()).padStart(2, '0')
  return {
    date: `${yyyy}-${mm}-${dd}`,
    time: '10:00',
    durationHours: 3,
    pickup: '서울시 강남구 역삼동 집 앞',
    destination: '서울아산병원',
    careTarget: '어머니',
    note: '',
  }
}

const BookingContext = createContext<BookingContextValue | null>(null)

export function BookingProvider({
  children,
  scope = 'all',
}: {
  children: ReactNode
  scope?: 'open' | 'mine' | 'all'
}) {
  const { token } = useAuth()
  const [draft, setDraftState] = useState<BookingDraft>(defaultDraft)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshBookings = useCallback(
    async (nextScope = scope) => {
      if (!token) {
        setBookings([])
        return
      }
      setLoading(true)
      setError(null)
      try {
        const q =
          nextScope && nextScope !== 'all' ? `?scope=${nextScope}` : ''
        const data = await api<{ bookings: Booking[] }>(`/api/bookings${q}`)
        setBookings(data.bookings)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load bookings')
      } finally {
        setLoading(false)
      }
    },
    [token, scope],
  )

  useEffect(() => {
    void refreshBookings()
    if (!token) return
    const id = window.setInterval(() => {
      void refreshBookings()
    }, 4000)
    return () => clearInterval(id)
  }, [refreshBookings, token])

  const value = useMemo<BookingContextValue>(
    () => ({
      draft,
      setDraft: (patch) => setDraftState((prev) => ({ ...prev, ...patch })),
      resetDraft: () => setDraftState(defaultDraft()),
      bookings,
      loading,
      error,
      refreshBookings,
      openRequests: bookings.filter(
        (b) => b.status === 'matching' && !b.manager,
      ),
      createBooking: async () => {
        if (!draft.service) return null
        const data = await api<{ booking: Booking }>('/api/bookings', {
          method: 'POST',
          body: JSON.stringify({
            serviceId: draft.service.id,
            date: draft.date,
            time: draft.time,
            durationHours: draft.durationHours,
            pickup: draft.pickup,
            destination: draft.destination,
            careTarget: draft.careTarget,
            note: draft.note,
          }),
        })
        setBookings((prev) => [data.booking, ...prev])
        return data.booking
      },
      updateBooking: async (id, patch) => {
        if (!patch.status) return
        const data = await api<{ booking: Booking }>(
          `/api/bookings/${id}/status`,
          {
            method: 'PATCH',
            body: JSON.stringify({ status: patch.status }),
          },
        )
        setBookings((prev) =>
          prev.map((b) => (b.id === id ? data.booking : b)),
        )
      },
      acceptBooking: async (id) => {
        try {
          const data = await api<{ booking: Booking }>(
            `/api/bookings/${id}/accept`,
            { method: 'POST' },
          )
          setBookings((prev) => {
            const rest = prev.filter((b) => b.id !== id)
            return [data.booking, ...rest]
          })
          return true
        } catch {
          await refreshBookings()
          return false
        }
      },
      declineBooking: async (id) => {
        await api(`/api/bookings/${id}/decline`, { method: 'POST' })
        setBookings((prev) => prev.filter((b) => b.id !== id))
      },
      matchManager: async (id) => {
        // 폴링으로 매니저 수락을 기다림
        for (let i = 0; i < 30; i++) {
          const data = await api<{ booking: Booking }>(`/api/bookings/${id}`)
          setBookings((prev) =>
            prev.map((b) => (b.id === id ? data.booking : b)),
          )
          if (data.booking.manager) return data.booking.manager
          await new Promise((r) => setTimeout(r, 2000))
        }
        throw new Error('매니저 수락 대기 시간이 초과되었습니다.')
      },
    }),
    [draft, bookings, loading, error, refreshBookings],
  )

  return (
    <BookingContext.Provider value={value}>{children}</BookingContext.Provider>
  )
}

export function useBooking() {
  const ctx = useContext(BookingContext)
  if (!ctx) throw new Error('useBooking must be used within BookingProvider')
  return ctx
}
