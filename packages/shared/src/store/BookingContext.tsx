import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api, ApiClientError } from '../api/client'
import type { Manager } from '../data/managers'
import type { ServiceItem } from '../data/services'
import { useAuth } from './AuthContext'

export type BookingStatus =
  | 'matching'
  | 'matched'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

export type PaymentStatus = 'unpaid' | 'pending' | 'paid' | 'refunded'

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
  paymentStatus?: PaymentStatus
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
  getBooking: (id: string) => Promise<Booking>
  createBooking: () => Promise<Booking | null>
  updateBooking: (
    id: string,
    patch: Partial<Booking> & { status?: BookingStatus },
  ) => Promise<Booking>
  acceptBooking: (id: string, _manager?: Manager) => Promise<boolean>
  declineBooking: (id: string) => Promise<void>
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

export const paymentStatusLabel: Record<PaymentStatus, string> = {
  unpaid: '미결제',
  pending: '결제 중',
  paid: '결제완료',
  refunded: '환불',
}

export const bookingStatusLabel: Record<BookingStatus, string> = {
  matching: '매칭 중',
  matched: '매니저 배정됨',
  confirmed: '예약 확정',
  in_progress: '서비스 진행 중',
  completed: '이용 완료',
  cancelled: '취소됨',
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

  const setDraft = useCallback((patch: Partial<BookingDraft>) => {
    setDraftState((prev) => ({ ...prev, ...patch }))
  }, [])

  const resetDraft = useCallback(() => {
    setDraftState(defaultDraft())
  }, [])

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

  const upsert = useCallback((booking: Booking) => {
    setBookings((prev) => {
      const rest = prev.filter((b) => b.id !== booking.id)
      return [booking, ...rest]
    })
  }, [])

  const getBooking = useCallback(
    async (id: string) => {
      const data = await api<{ booking: Booking }>(`/api/bookings/${id}`)
      upsert(data.booking)
      return data.booking
    },
    [upsert],
  )

  const createBooking = useCallback(async () => {
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
    upsert(data.booking)
    return data.booking
  }, [draft, upsert])

  const updateBooking = useCallback(
    async (id: string, patch: Partial<Booking> & { status?: BookingStatus }) => {
      if (!patch.status) {
        throw new Error('상태 변경이 필요합니다.')
      }
      const data = await api<{ booking: Booking }>(
        `/api/bookings/${id}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status: patch.status }),
        },
      )
      upsert(data.booking)
      return data.booking
    },
    [upsert],
  )

  const acceptBooking = useCallback(
    async (id: string) => {
      try {
        const data = await api<{ booking: Booking }>(
          `/api/bookings/${id}/accept`,
          { method: 'POST' },
        )
        upsert(data.booking)
        return true
      } catch (e) {
        await refreshBookings()
        if (e instanceof ApiClientError) throw e
        return false
      }
    },
    [upsert, refreshBookings],
  )

  const declineBooking = useCallback(async (id: string) => {
    await api(`/api/bookings/${id}/decline`, { method: 'POST' })
    setBookings((prev) => prev.filter((b) => b.id !== id))
  }, [])

  const value = useMemo<BookingContextValue>(
    () => ({
      draft,
      setDraft,
      resetDraft,
      bookings,
      loading,
      error,
      refreshBookings,
      getBooking,
      createBooking,
      updateBooking,
      acceptBooking,
      declineBooking,
      openRequests: bookings.filter(
        (b) => b.status === 'matching' && !b.manager,
      ),
    }),
    [
      draft,
      setDraft,
      resetDraft,
      bookings,
      loading,
      error,
      refreshBookings,
      getBooking,
      createBooking,
      updateBooking,
      acceptBooking,
      declineBooking,
    ],
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
