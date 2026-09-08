/** 거리·지오코딩 유틸 */

export type LatLng = { lat: number; lng: number }

const EARTH_KM = 6371

export function haversineKm(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return Math.round(EARTH_KM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)) * 10) / 10
}

/** 키 없을 때 서울 일대 대략 좌표 (주소 해시 기반) */
function fallbackGeocode(address: string): LatLng {
  let hash = 0
  for (let i = 0; i < address.length; i++) {
    hash = (hash * 31 + address.charCodeAt(i)) >>> 0
  }
  const lat = 37.48 + ((hash % 2000) / 2000) * 0.18
  const lng = 126.9 + (((hash / 2000) | 0) % 2000) / 2000 * 0.28
  return { lat: Math.round(lat * 1e5) / 1e5, lng: Math.round(lng * 1e5) / 1e5 }
}

/** 카카오 Local REST → 실패 시 Nominatim → 최종 fallback */
export async function geocodeAddress(address: string): Promise<LatLng | null> {
  const trimmed = address.trim()
  if (!trimmed) return null

  const kakaoKey = process.env.KAKAO_REST_API_KEY
  if (kakaoKey) {
    try {
      const url = new URL('https://dapi.kakao.com/v2/local/search/address.json')
      url.searchParams.set('query', trimmed)
      const res = await fetch(url, {
        headers: { Authorization: `KakaoAK ${kakaoKey}` },
      })
      if (res.ok) {
        const data = (await res.json()) as {
          documents?: Array<{ x: string; y: string }>
        }
        const doc = data.documents?.[0]
        if (doc) {
          return {
            lat: Number(doc.y),
            lng: Number(doc.x),
          }
        }
      }
      // 키워드 검색 폴백
      const kw = new URL('https://dapi.kakao.com/v2/local/search/keyword.json')
      kw.searchParams.set('query', trimmed)
      const kwRes = await fetch(kw, {
        headers: { Authorization: `KakaoAK ${kakaoKey}` },
      })
      if (kwRes.ok) {
        const data = (await kwRes.json()) as {
          documents?: Array<{ x: string; y: string }>
        }
        const doc = data.documents?.[0]
        if (doc) {
          return { lat: Number(doc.y), lng: Number(doc.x) }
        }
      }
    } catch (err) {
      console.warn('[geo] kakao failed', err)
    }
  }

  try {
    const url = new URL('https://nominatim.openstreetmap.org/search')
    url.searchParams.set('q', trimmed)
    url.searchParams.set('format', 'json')
    url.searchParams.set('limit', '1')
    const res = await fetch(url, {
      headers: { 'User-Agent': 'withyou-mosimi-api/1.0' },
    })
    if (res.ok) {
      const data = (await res.json()) as Array<{ lat: string; lon: string }>
      if (data[0]) {
        return {
          lat: Number(data[0].lat),
          lng: Number(data[0].lon),
        }
      }
    }
  } catch (err) {
    console.warn('[geo] nominatim failed', err)
  }

  return fallbackGeocode(trimmed)
}

export function effectiveManagerLocation(profile: {
  last_lat: number | null
  last_lng: number | null
  base_lat: number | null
  base_lng: number | null
}): LatLng | null {
  if (profile.last_lat != null && profile.last_lng != null) {
    return { lat: profile.last_lat, lng: profile.last_lng }
  }
  if (profile.base_lat != null && profile.base_lng != null) {
    return { lat: profile.base_lat, lng: profile.base_lng }
  }
  return null
}
