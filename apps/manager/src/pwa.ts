/** PWA 서비스 워커 등록 (설치·오프라인 셸) */
export function registerPwa() {
  if (!('serviceWorker' in navigator)) return
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.warn('[pwa] sw register failed', err)
    })
  })
}
