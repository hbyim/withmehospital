import { useCallback, useEffect, useRef, useState } from 'react'
import { postManagerLocation } from '../location/tracking'

const WATCH_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 10_000,
  timeout: 20_000,
}

/** 매니저 위치 공유 ON일 때 GPS watch → API 업로드 */
export function useManagerGps(enabled: boolean) {
  const [lastFix, setLastFix] = useState<{
    lat: number
    lng: number
    accuracy?: number
    at: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const lastSentAt = useRef(0)

  const pushFix = useCallback(async (coords: GeolocationCoordinates) => {
    const now = Date.now()
    if (now - lastSentAt.current < 8_000) return
    lastSentAt.current = now
    setUploading(true)
    setError(null)
    try {
      await postManagerLocation({
        lat: coords.latitude,
        lng: coords.longitude,
        accuracy: coords.accuracy,
      })
      setLastFix({
        lat: coords.latitude,
        lng: coords.longitude,
        accuracy: coords.accuracy,
        at: new Date().toISOString(),
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : '위치 전송 실패')
    } finally {
      setUploading(false)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    if (!navigator.geolocation) {
      setError('이 기기에서 위치 서비스를 사용할 수 없습니다.')
      return
    }

    setError(null)
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        void pushFix(pos.coords)
      },
      (err) => {
        setError(
          err.code === err.PERMISSION_DENIED
            ? '위치 권한이 거부되었습니다. 설정에서 허용해 주세요.'
            : '위치를 가져오지 못했습니다.',
        )
      },
      WATCH_OPTIONS,
    )

    const interval = window.setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => void pushFix(pos.coords),
        () => undefined,
        WATCH_OPTIONS,
      )
    }, 30_000)

    return () => {
      navigator.geolocation.clearWatch(watchId)
      window.clearInterval(interval)
    }
  }, [enabled, pushFix])

  return { lastFix, error, uploading }
}
