import {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import type { Manager } from '../data/managers'
import { managers, pickNearbyManager } from '../data/managers'
import type { ServiceItem } from '../data/services'
import {
  BOOKINGS_CHANNEL,
  BOOKINGS_STORAGE_KEY,
  emitBookingsChanged,
} from './storage'

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
  createBooking: () => Booking | null
  updateBooking: (id: string, patch: Partial<Booking>) => void
  acceptBooking: (id: string, manager: Manager) => boolean
  /** @deprecated 자동 매칭 대신 매니저 수락을 사용합니다 */
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

function hospitalService(): ServiceItem {
  return {
    id: 'hospital',
    category: 'companion',
    name: '병원 동행',
    description: '집 출발부터 접수·진료 대기·귀가까지 함께합니다.',
    basePrice: 35000,
    unit: '3시간',
    durationHint: '기본 3시간',
    icon: 'hospital',
  }
}

function seedBookings(): Booking[] {
  const today = new Date().toISOString().slice(0, 10)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().slice(0, 10)

  return [
    {
      id: 'demo-open-1',
      service: hospitalService(),
      date: today,
      time: '15:30',
      durationHours: 3,
      pickup: '서울시 송파구 잠실동',
      destination: '서울아산병원',
      careTarget: '어머니',
      note: '휠체어 필요 · 외래 내과 있음',
      price: 35000,
      status: 'matching',
      customerName: '이보호',
      createdAt: new Date(Date.now() - 4 * 60_000).toISOString(),
    },
    {
      id: 'demo-open-2',
      service: {
        id: 'elder',
        category: 'care',
        name: '노인 돌봄',
        description: '일상 케어, 약 복용 확인, 말벗 등 맞춤 돌봄.',
        basePrice: 30000,
        unit: '3시간',
        durationHint: '기본 3시간',
        icon: 'elder',
      },
      date: tomorrowStr,
      time: '09:00',
      durationHours: 4,
      pickup: '서울시 마포구 연남동',
      destination: '자택 / 돌봄 장소',
      careTarget: '아버지',
      note: '오후 약 복용 확인 부탁드립니다',
      price: 40000,
      status: 'matching',
      customerName: '박신청',
      createdAt: new Date(Date.now() - 12 * 60_000).toISOString(),
    },
    {
      id: 'demo-open-3',
      service: {
        id: 'dialysis',
        category: 'companion',
        name: '투석 전용 동행',
        description: '정기 투석 일정에 맞춰 이동과 대기를 지원합니다.',
        basePrice: 40000,
        unit: '회',
        durationHint: '평균 4시간',
        icon: 'dialysis',
      },
      date: tomorrowStr,
      time: '07:30',
      durationHours: 4,
      pickup: '서울시 강남구 대치동',
      destination: '강남세브란스병원',
      careTarget: '본인',
      note: '',
      price: 40000,
      status: 'matching',
      customerName: '최이용',
      createdAt: new Date(Date.now() - 20 * 60_000).toISOString(),
    },
    {
      id: 'demo-1',
      service: hospitalService(),
      date: today,
      time: '14:00',
      durationHours: 3,
      pickup: '서울시 마포구 연남동',
      destination: '세브란스병원',
      careTarget: '아버지',
      note: '휠체어 필요',
      price: 35000,
      status: 'confirmed',
      manager: pickNearbyManager(1),
      customerName: '김모시',
      createdAt: new Date(Date.now() - 86_400_000).toISOString(),
      acceptedAt: new Date(Date.now() - 80_000_000).toISOString(),
    },
  ]
}

function loadBookings(): Booking[] {
  try {
    const raw = localStorage.getItem(BOOKINGS_STORAGE_KEY)
    if (!raw) return seedBookings()
    const parsed = JSON.parse(raw) as Booking[]
    return Array.isArray(parsed) ? parsed : seedBookings()
  } catch {
    return seedBookings()
  }
}

function persistBookings(bookings: Booking[]) {
  localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(bookings))
  emitBookingsChanged()
}

export function BookingProvider({ children }: { children: ReactNode }) {
  const [draft, setDraftState] = useState<BookingDraft>(defaultDraft)
  const [bookings, setBookings] = useState<Booking[]>(() => loadBookings())

  const reloadFromStorage = useCallback(() => {
    setBookings(loadBookings())
  }, [])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === BOOKINGS_STORAGE_KEY) reloadFromStorage()
    }
    const onCustom = () => reloadFromStorage()

    window.addEventListener('storage', onStorage)
    window.addEventListener('mosimi-bookings-updated', onCustom)

    let channel: BroadcastChannel | null = null
    try {
      channel = new BroadcastChannel(BOOKINGS_CHANNEL)
      channel.onmessage = () => reloadFromStorage()
    } catch {
      channel = null
    }

    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('mosimi-bookings-updated', onCustom)
      channel?.close()
    }
  }, [reloadFromStorage])

  const commit = useCallback((updater: (prev: Booking[]) => Booking[]) => {
    setBookings((prev) => {
      const next = updater(prev)
      persistBookings(next)
      return next
    })
  }, [])

  const value = useMemo<BookingContextValue>(
    () => ({
      draft,
      setDraft: (patch) => setDraftState((prev) => ({ ...prev, ...patch })),
      resetDraft: () => setDraftState(defaultDraft()),
      bookings,
      openRequests: bookings.filter((b) => b.status === 'matching' && !b.manager),
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
          customerName: '김모시',
          createdAt: new Date().toISOString(),
        }
        commit((prev) => [booking, ...prev])
        return booking
      },
      updateBooking: (id, patch) => {
        commit((prev) =>
          prev.map((b) => (b.id === id ? { ...b, ...patch } : b)),
        )
      },
      acceptBooking: (id, manager) => {
        let accepted = false
        setBookings((prev) => {
          const target = prev.find((b) => b.id === id)
          if (!target || target.status !== 'matching' || target.manager) {
            return prev
          }
          accepted = true
          const next = prev.map((b) =>
            b.id === id
              ? {
                  ...b,
                  manager,
                  status: 'matched' as const,
                  acceptedAt: new Date().toISOString(),
                }
              : b,
          )
          persistBookings(next)
          return next
        })
        return accepted
      },
      matchManager: (id) =>
        new Promise((resolve) => {
          const manager = managers[0]
          commit((prev) =>
            prev.map((b) =>
              b.id === id && b.status === 'matching'
                ? {
                    ...b,
                    manager,
                    status: 'matched' as const,
                    acceptedAt: new Date().toISOString(),
                  }
                : b,
            ),
          )
          resolve(manager)
        }),
    }),
    [draft, bookings, commit],
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
