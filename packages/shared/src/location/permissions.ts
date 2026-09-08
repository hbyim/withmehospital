export type LocationPermissionState =
  | 'granted'
  | 'denied'
  | 'prompt'
  | 'unsupported'

export type LocationPermissionResult = {
  granted: boolean
  state: LocationPermissionState
  position?: {
    lat: number
    lng: number
    accuracy?: number
  }
  message?: string
}

type CapacitorGeolocationPlugin = {
  requestPermissions?: () => Promise<{ location?: string; coarseLocation?: string }>
  checkPermissions?: () => Promise<{ location?: string; coarseLocation?: string }>
  getCurrentPosition: (opts?: {
    enableHighAccuracy?: boolean
    timeout?: number
  }) => Promise<{
    coords: { latitude: number; longitude: number; accuracy?: number }
  }>
}

declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform?: () => boolean
      Plugins?: {
        Geolocation?: CapacitorGeolocationPlugin
      }
    }
  }
}

const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 20_000,
  maximumAge: 0,
}

function capacitorGeo(): CapacitorGeolocationPlugin | null {
  try {
    if (!window.Capacitor?.isNativePlatform?.()) return null
    return window.Capacitor.Plugins?.Geolocation ?? null
  } catch {
    return null
  }
}

function mapCapState(raw?: string): LocationPermissionState {
  if (raw === 'granted') return 'granted'
  if (raw === 'denied') return 'denied'
  if (raw === 'prompt') return 'prompt'
  return 'prompt'
}

/** 현재 위치 권한 상태 조회 (가능하면 Permissions API) */
export async function queryLocationPermission(): Promise<LocationPermissionState> {
  const cap = capacitorGeo()
  if (cap?.checkPermissions) {
    try {
      const status = await cap.checkPermissions()
      return mapCapState(status.location ?? status.coarseLocation)
    } catch {
      // fall through
    }
  }

  if (!navigator.geolocation) return 'unsupported'

  try {
    if (navigator.permissions?.query) {
      const status = await navigator.permissions.query({
        name: 'geolocation' as PermissionName,
      })
      if (status.state === 'granted') return 'granted'
      if (status.state === 'denied') return 'denied'
      return 'prompt'
    }
  } catch {
    // Safari 등 미지원
  }

  return 'prompt'
}

/**
 * 위치 권한 프롬프트를 띄우고, 허용 시 현재 좌표까지 확보한다.
 * - 웹: geolocation.getCurrentPosition (브라우저 권한 창)
 * - Capacitor 네이티브: Plugins.Geolocation.requestPermissions
 */
export async function requestLocationPermission(): Promise<LocationPermissionResult> {
  const cap = capacitorGeo()
  if (cap) {
    try {
      if (cap.requestPermissions) {
        const status = await cap.requestPermissions()
        const state = mapCapState(status.location ?? status.coarseLocation)
        if (state === 'denied') {
          return {
            granted: false,
            state: 'denied',
            message:
              '위치 권한이 거부되었습니다. 설정 앱에서 위치 접근을 허용해 주세요.',
          }
        }
      }
      const pos = await cap.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 20_000,
      })
      return {
        granted: true,
        state: 'granted',
        position: {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        },
      }
    } catch (e) {
      return {
        granted: false,
        state: 'denied',
        message:
          e instanceof Error
            ? e.message
            : '네이티브 위치 권한을 얻지 못했습니다.',
      }
    }
  }

  if (!navigator.geolocation) {
    return {
      granted: false,
      state: 'unsupported',
      message: '이 기기/브라우저에서 위치 서비스를 사용할 수 없습니다.',
    }
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          granted: true,
          state: 'granted',
          position: {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          },
        })
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          resolve({
            granted: false,
            state: 'denied',
            message:
              '위치 권한이 거부되었습니다. 브라우저/기기 설정에서 위치 접근을 허용한 뒤 다시 시도해 주세요.',
          })
          return
        }
        if (err.code === err.TIMEOUT) {
          resolve({
            granted: false,
            state: 'prompt',
            message: '위치 확인 시간이 초과되었습니다. 다시 시도해 주세요.',
          })
          return
        }
        resolve({
          granted: false,
          state: 'prompt',
          message: '위치를 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.',
        })
      },
      GEO_OPTIONS,
    )
  })
}
