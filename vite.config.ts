import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Vercel 배포 시 base는 루트 경로 사용 (주석 처리)
  // GitHub Pages 배포 시: base: '/rainrain/'
  base: process.env.VERCEL ? '/' : '/rainrain/',
})

