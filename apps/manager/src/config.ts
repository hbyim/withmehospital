export const CUSTOMER_APP_URL =
  import.meta.env.VITE_CUSTOMER_APP_URL ||
  (import.meta.env.DEV ? 'http://localhost:5173/' : '../')
