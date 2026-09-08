import { useCallback, useEffect, useRef, useState } from 'react'
import {
  queryLocationPermission,
  requestLocationPermission,
  type LocationPermissionState,
} from '../location/permissions'
import { postManagerLocation } from '../location/tracking'

const WATCH_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 10_000,
  timeout: 20_000,
}

/** 매니저 위치 공유 ON일 때 권한 확보 → GPS watch → API 업로드 */
export function useManagerGps(enabled: boolean) {
  const [lastFix, setLastFix] = useState<{
    lat: number
    lng: number
    accuracy?: number
    at: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [permission, setPermission] =
    useState<LocationPermissionState>('prompt')
  const lastSentAt = useRef(0)

  const pushFix = useCallback(
    async (input: { lat: number; lng: number; accuracy?: number }) => {
      const now = Date.now()
      if (now - lastSentAt.current < 8_000) return
      lastSentAt.current = now
      setUploading(true)
      setError(null)
      try {
        await postManagerLocation({
          lat: input.lat,
          lng: input.lng,
          accuracy: input.accuracy,
        })
        setLastFix({
          lat: input.lat,
          lng: input.lng,
          accuracy: input.accuracy,
          at: new Date().toISOString(),
        })
      } catch (e) {
        setError(e instanceof Error ? e.message : '위치 전송 실패')
      } finally {
        setUploading(false)
      }
    },
    [],
  )

  const ensurePermission = useCallback(async () => {
    const current = await queryLocationPermission()
    setPermission(current)
    if (current === 'granted') return true
    if (current === 'unsupported') {
      setError('이 기기에서 위치 서비스를 사용할 수 없습니다.')
      return false
    }

    const result = await requestLocationPermission()
    setPermission(result.state)
    if (!result.granted) {
      setError(result.message ?? '위치 권한이 필요합니다.')
      return false
    }
    setError(null)
    if (result.position) {
      await pushFix(result.position)
    }
    return true
  }, [pushFix])

  useEffect(() => {
    void queryLocationPermission().then(setPermission)
  }, [])

  useEffect(() => {
    if (!enabled) return

    let cancelled = false
    let watchId: number | null = null
    let interval: number | null = null

    void (async () => {
      const ok = await ensurePermission()
      if (!ok || cancelled) return
      if (!navigator.geolocation) {
        setError('이 기기에서 위치 서비스를 사용할 수 없습니다.')
        return
      }

      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          void pushFix({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          })
        },
        (err) => {
          setPermission(
            err.code === err.PERMISSION_DENIED ? 'denied' : 'prompt',
          )
          setError(
            err.code === err.PERMISSION_DENIED
              ? '위치 권한이 거부되었습니다. 설정에서 허용해 주세요.'
              : '위치를 가져오지 못했습니다.',
          )
        },
        WATCH_OPTIONS,
      )

      interval = window.setInterval(() => {
        navigator.geolocation.getCurrentPosition(
          (pos) =>
            void pushFix({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
            }),
          () => undefined,
          WATCH_OPTIONS,
        )
      }, 30_000)
    })()

    return () => {
      cancelled = true
      if (watchId != null) navigator.geolocation.clearWatch(watchId)
      if (interval != null) window.clearInterval(interval)
    }
  }, [enabled, ensurePermission, pushFix])

  return {
    lastFix,
    error,
    uploading,
    permission,
    requestPermission: ensurePermission,
  }
}
