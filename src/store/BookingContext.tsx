import {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  type ReactNode,
} from 'react'
import type { Manager } from '../data/managers'
import { pickNearbyManager } from '../data/managers'
import type { ServiceItem } from '../data/services'

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
  manager?: Manager
  createdAt: string
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
  createBooking: () => Booking | null
  updateBooking: (id: string, patch: Partial<Booking>) => void
  matchManager: (id: string) => Promise<Manager>
}

const STORAGE_KEY = 'mosimi-plus-demo-bookings'

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

function loadBookings(): Booking[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return seedBookings()
    return JSON.parse(raw) as Booking[]
  } catch {
    return seedBookings()
  }
}

function seedBookings(): Booking[] {
  const manager = pickNearbyManager(1)
  return [
    {
      id: 'demo-1',
      service: {
        id: 'hospital',
        category: 'companion',
        name: '병원 동행',
        description: '집 출발부터 접수·진료 대기·귀가까지 함께합니다.',
        basePrice: 35000,
        unit: '3시간',
        durationHint: '기본 3시간',
        icon: 'hospital',
      },
      date: new Date().toISOString().slice(0, 10),
      time: '14:00',
      durationHours: 3,
      pickup: '서울시 마포구 연남동',
      destination: '세브란스병원',
      careTarget: '아버지',
      note: '휠체어 필요',
      price: 35000,
      status: 'confirmed',
      manager,
      createdAt: new Date().toISOString(),
    },
  ]
}

export function BookingProvider({ children }: { children: ReactNode }) {
  const [draft, setDraftState] = useState<BookingDraft>(defaultDraft)
  const [bookings, setBookings] = useState<Booking[]>(() => loadBookings())

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings))
  }, [bookings])

  const value = useMemo<BookingContextValue>(
    () => ({
      draft,
      setDraft: (patch) => setDraftState((prev) => ({ ...prev, ...patch })),
      resetDraft: () => setDraftState(defaultDraft()),
      bookings,
      createBooking: () => {
        if (!draft.service) return null
        const price =
          draft.service.basePrice +
          Math.max(0, draft.durationHours - 3) * 10000
        const booking: Booking = {
          id: `bk-${Date.now()}`,
          service: draft.service,
          date: draft.date,
          time: draft.time,
          durationHours: draft.durationHours,
          pickup: draft.pickup,
          destination: draft.destination,
          careTarget: draft.careTarget,
          note: draft.note,
          price,
          status: 'matching',
          createdAt: new Date().toISOString(),
        }
        setBookings((prev) => [booking, ...prev])
        return booking
      },
      updateBooking: (id, patch) => {
        setBookings((prev) =>
          prev.map((b) => (b.id === id ? { ...b, ...patch } : b)),
        )
      },
      matchManager: (id) =>
        new Promise((resolve) => {
          setTimeout(() => {
            const manager = pickNearbyManager(Date.now())
            setBookings((prev) =>
              prev.map((b) =>
                b.id === id
                  ? { ...b, manager, status: 'matched' as const }
                  : b,
              ),
            )
            resolve(manager)
          }, 2200)
        }),
    }),
    [draft, bookings],
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
