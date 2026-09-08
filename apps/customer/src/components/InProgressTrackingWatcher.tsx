import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useBooking } from '@mosimi/shared'

const SEEN_KEY = 'withu-tracking-auto-seen'

function readSeen(): Record<string, true> {
  try {
    return JSON.parse(sessionStorage.getItem(SEEN_KEY) || '{}') as Record<
      string,
      true
    >
  } catch {
    return {}
  }
}

function markSeen(bookingId: string) {
  const next = { ...readSeen(), [bookingId]: true as const }
  sessionStorage.setItem(SEEN_KEY, JSON.stringify(next))
}

/**
 * 매니저가 서비스를 시작하면(in_progress) 고객 앱을 위치 추적 화면으로 자동 이동.
 * 같은 예약은 세션당 1회만 강제 이동(이탈 후 재강제 방지).
 */
export function InProgressTrackingWatcher() {
  const { bookings } = useBooking()
  const navigate = useNavigate()
  const location = useLocation()
  const prevStatus = useRef<Record<string, string>>({})
  const primed = useRef(false)

  useEffect(() => {
    const onTracking = location.pathname.includes('/tracking/')
    const seen = readSeen()

    for (const b of bookings) {
      const prev = prevStatus.current[b.id]
      let shouldGo = false

      if (b.status === 'in_progress' && !onTracking && !seen[b.id]) {
        if (!primed.current) {
          shouldGo = true
        } else if (prev !== undefined && prev !== 'in_progress') {
          shouldGo = true
        }
      }

      if (shouldGo) {
        markSeen(b.id)
        prevStatus.current[b.id] = b.status
        primed.current = true
        navigate(`/tracking/${b.id}`)
        return
      }

      if (b.status === 'in_progress' && onTracking) {
        markSeen(b.id)
      }
      prevStatus.current[b.id] = b.status
    }

    primed.current = true
  }, [bookings, navigate, location.pathname])

  return null
}
