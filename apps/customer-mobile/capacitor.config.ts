import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'plus.mosimi.customer',
  appName: '위드유',
  webDir: 'www',
  server: {
    // GitHub Pages 고객 앱 (HashRouter)
    url: 'https://hbyim.github.io/withmehospital/',
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#1B6B66',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#1B6B66',
    },
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#1B6B66',
  },
}

export default config
