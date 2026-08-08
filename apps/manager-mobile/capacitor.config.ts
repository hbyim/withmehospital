import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'plus.mosimi.manager',
  appName: '모시미+ 매니저',
  webDir: 'www',
  server: {
    url: 'https://hbyim.github.io/withmehospital/manager/',
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#2F4F7A',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#2F4F7A',
    },
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#2F4F7A',
  },
}

export default config
