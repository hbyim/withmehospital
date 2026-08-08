import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'plus.mosimi.customer',
  appName: '모시미+',
  webDir: 'www',
  server: {
    // GitHub Pages 고객 앱 (HashRouter)
    url: 'https://hbyim.github.io/withmehospital/',
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#1A7A72',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#1A7A72',
    },
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#1A7A72',
  },
}

export default config
