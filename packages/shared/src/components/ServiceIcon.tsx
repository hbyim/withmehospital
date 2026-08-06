import type { ReactNode } from 'react'

const icons: Record<string, ReactNode> = {
  hospital: (
    <>
      <path d="M8 20V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v14" />
      <path d="M4 20h16" />
      <path d="M12 8v4M10 10h4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l2.5 2.5" />
    </>
  ),
  dialysis: (
    <>
      <path d="M8 4h8v4H8zM7 8h10v12H7z" />
      <path d="M10 12h4M10 16h4" />
    </>
  ),
  checkup: (
    <>
      <circle cx="12" cy="8" r="3" />
      <path d="M6 20c1.5-4 8.5-4 12 0" />
      <path d="M16 5l2 2 3-3" />
    </>
  ),
  bed: (
    <>
      <path d="M3 18V10a2 2 0 0 1 2-2h6v10" />
      <path d="M11 12h8a2 2 0 0 1 2 2v4" />
      <path d="M3 18h18" />
    </>
  ),
  walk: (
    <>
      <circle cx="13" cy="5" r="2" />
      <path d="M10 21l2-7 3 2 2 5M8 12l4 2 2-4" />
    </>
  ),
  elder: (
    <>
      <circle cx="12" cy="7" r="3" />
      <path d="M6 20c1-4 9-4 12 0" />
      <path d="M8 14h8" />
    </>
  ),
  child: (
    <>
      <circle cx="12" cy="8" r="3" />
      <path d="M7 20v-4a5 5 0 0 1 10 0v4" />
    </>
  ),
  home: (
    <>
      <path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9z" />
      <path d="M10 21v-7h4v7" />
    </>
  ),
  nurse: (
    <>
      <path d="M8 5h8v4H8z" />
      <path d="M6 9h12v10H6z" />
      <path d="M12 12v4M10 14h4" />
    </>
  ),
  heart: (
    <path d="M12 19s-7-4.5-7-9a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 4.5-7 9-7 9z" />
  ),
}

export function ServiceIcon({
  name,
  size = 22,
}: {
  name: string
  size?: number
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {icons[name] ?? icons.heart}
    </svg>
  )
}
