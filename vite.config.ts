import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages (project site)에서도 경로가 깨지지 않도록 상대 경로 사용
export default defineConfig({
  plugins: [react()],
  base: './',
})
