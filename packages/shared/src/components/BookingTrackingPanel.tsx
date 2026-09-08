import { useEffect, useMemo, useState } from 'react'
import {
  fetchBookingTracking,
  type BookingTracking,
} from '../location/tracking'
import { TrackingMap, type MapMarker } from '../components/TrackingMap'

type Props = {
  bookingId: string
  enabled?: boolean
  pollMs?: number
}

export function BookingTrackingPanel({
  bookingId,
  enabled = true,
  pollMs = 8_000,
}: Props) {
  const [tracking, setTracking] = useState<BookingTracking | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled || !bookingId) return
    let cancelled = false

    const load = async () => {
      try {
        const data = await fetchBookingTracking(bookingId)
        if (!cancelled) {
          setTracking(data)
          setError(null)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : '위치 조회 실패')
        }
      }
    }

    void load()
    const id = window.setInterval(() => void load(), pollMs)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [bookingId, enabled, pollMs])

  const markers = useMemo<MapMarker[]>(() => {
    if (!tracking) return []
    const list: MapMarker[] = []
    if (tracking.managerLocation) {
      list.push({
        id: 'manager',
        lat: tracking.managerLocation.lat,
        lng: tracking.managerLocation.lng,
        label: '매니저',
        color: '#2F6FED',
      })
    }
    if (tracking.pickup.location) {
      list.push({
        id: 'pickup',
        lat: tracking.pickup.location.lat,
        lng: tracking.pickup.location.lng,
        label: '픽업',
        color: '#1B7F4E',
      })
    }
    if (tracking.destination.location) {
      list.push({
        id: 'dest',
        lat: tracking.destination.location.lat,
        lng: tracking.destination.location.lng,
        label: '병원',
        color: '#C45C26',
      })
    }
    return list
  }, [tracking])

  if (!enabled) return null

  return (
    <section className="tracking-panel">
      <div className="tracking-panel-head">
        <h3>실시간 위치</h3>
        {tracking?.distanceToPickupKm != null && (
          <span className="muted small">
            픽업까지 약 {tracking.distanceToPickupKm.toFixed(1)}km
          </span>
        )}
      </div>
      {error && <p className="form-error">{error}</p>}
      {!tracking?.shareLocation && tracking?.status !== 'matched' && (
        <p className="muted small">
          매니저가 위치 공유를 켜면 실시간 위치가 표시됩니다.
        </p>
      )}
      {tracking?.status === 'matched' && (
        <p className="muted small">
          예약 확정 후 매니저 실시간 위치가 활성화됩니다. (지금은 활동 거점)
        </p>
      )}
      <TrackingMap markers={markers} height={220} />
      {tracking?.locationUpdatedAt && (
        <p className="muted small">
          마지막 위치:{' '}
          {new Date(tracking.locationUpdatedAt).toLocaleTimeString('ko-KR')}
        </p>
      )}
    </section>
  )
}
