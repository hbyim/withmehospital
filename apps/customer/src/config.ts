export const MANAGER_APP_URL =
  import.meta.env.VITE_MANAGER_APP_URL ||
  (import.meta.env.DEV ? 'http://localhost:5174/' : './manager/')
