import { useEffect, useRef } from 'react'

export type MapMarker = {
  id: string
  lat: number
  lng: number
  label: string
  color?: string
}

type Props = {
  markers: MapMarker[]
  className?: string
  height?: number
}

type LeafletMap = {
  setView: (latlng: [number, number], zoom: number) => LeafletMap
  remove: () => void
  fitBounds: (
    bounds: unknown,
    options?: { padding?: [number, number] },
  ) => void
}

type LeafletMarker = {
  addTo: (map: LeafletMap) => LeafletMarker
  bindPopup: (html: string) => LeafletMarker
  setLatLng: (latlng: [number, number]) => LeafletMarker
}

type LeafletNs = {
  map: (el: HTMLElement) => LeafletMap
  tileLayer: (
    url: string,
    opts: Record<string, unknown>,
  ) => { addTo: (map: LeafletMap) => void }
  marker: (
    latlng: [number, number],
    opts?: { icon?: unknown },
  ) => LeafletMarker
  divIcon: (opts: {
    className: string
    html: string
    iconSize: [number, number]
    iconAnchor: [number, number]
  }) => unknown
  latLngBounds: (points: [number, number][]) => unknown
}

declare global {
  interface Window {
    L?: LeafletNs
  }
}

let leafletPromise: Promise<LeafletNs> | null = null

function loadLeaflet(): Promise<LeafletNs> {
  if (window.L) return Promise.resolve(window.L)
  if (leafletPromise) return leafletPromise

  leafletPromise = new Promise((resolve, reject) => {
    const cssHref = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    if (!document.querySelector(`link[href="${cssHref}"]`)) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = cssHref
      document.head.appendChild(link)
    }

    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-leaflet]',
    )
    if (existing) {
      existing.addEventListener('load', () => {
        if (window.L) resolve(window.L)
        else reject(new Error('Leaflet load failed'))
      })
      return
    }

    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.async = true
    script.dataset.leaflet = '1'
    script.onload = () => {
      if (window.L) resolve(window.L)
      else reject(new Error('Leaflet load failed'))
    }
    script.onerror = () => reject(new Error('Leaflet script error'))
    document.head.appendChild(script)
  })

  return leafletPromise
}

function pinHtml(label: string, color: string) {
  return `<div style="
    background:${color};
    color:#fff;
    font:600 11px/1.2 system-ui,sans-serif;
    padding:6px 8px;
    border-radius:999px;
    box-shadow:0 2px 8px rgba(0,0,0,.25);
    white-space:nowrap;
  ">${label}</div>`
}

/** OSM + Leaflet 실시간 트래킹 맵 */
export function TrackingMap({ markers, className, height = 240 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const markerRefs = useRef<Map<string, LeafletMarker>>(new Map())

  useEffect(() => {
    let cancelled = false
    void loadLeaflet().then((L) => {
      if (cancelled || !containerRef.current || mapRef.current) return
      const center: [number, number] =
        markers[0] != null
          ? [markers[0].lat, markers[0].lng]
          : [37.5665, 126.978]
      const map = L.map(containerRef.current).setView(center, 13)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map)
      mapRef.current = map
    })
    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
      markerRefs.current.clear()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
  }, [])

  useEffect(() => {
    void loadLeaflet().then((L) => {
      const map = mapRef.current
      if (!map) return

      const seen = new Set<string>()
      for (const m of markers) {
        seen.add(m.id)
        const latlng: [number, number] = [m.lat, m.lng]
        const existing = markerRefs.current.get(m.id)
        if (existing) {
          existing.setLatLng(latlng)
          continue
        }
        const icon = L.divIcon({
          className: 'tracking-pin',
          html: pinHtml(m.label, m.color ?? '#2F4F7A'),
          iconSize: [72, 28],
          iconAnchor: [36, 14],
        })
        const marker = L.marker(latlng, { icon }).addTo(map).bindPopup(m.label)
        markerRefs.current.set(m.id, marker)
      }

      for (const [id, marker] of markerRefs.current) {
        if (!seen.has(id)) {
          marker.setLatLng([0, 0])
          markerRefs.current.delete(id)
        }
      }

      if (markers.length >= 2) {
        map.fitBounds(
          L.latLngBounds(markers.map((m) => [m.lat, m.lng] as [number, number])),
          { padding: [28, 28] },
        )
      } else if (markers.length === 1) {
        map.setView([markers[0].lat, markers[0].lng], 14)
      }
    })
  }, [markers])

  if (markers.length === 0) {
    return (
      <div
        className={className ?? 'tracking-map empty'}
        style={{ height, display: 'grid', placeItems: 'center' }}
      >
        <p className="muted small">표시할 위치가 없습니다.</p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={className ?? 'tracking-map'}
      style={{ height, width: '100%', borderRadius: 16, overflow: 'hidden' }}
    />
  )
}
