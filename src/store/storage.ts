export const BOOKINGS_STORAGE_KEY = 'mosimi-plus-demo-bookings-v2'
export const MANAGER_SESSION_KEY = 'mosimi-plus-manager-session'
export const BOOKINGS_CHANNEL = 'mosimi-plus-bookings'

export function emitBookingsChanged() {
  try {
    const channel = new BroadcastChannel(BOOKINGS_CHANNEL)
    channel.postMessage({ type: 'bookings-updated', at: Date.now() })
    channel.close()
  } catch {
    // BroadcastChannel unsupported — storage event still syncs across tabs
  }
  // Same-tab listeners
  window.dispatchEvent(new Event('mosimi-bookings-updated'))
}
