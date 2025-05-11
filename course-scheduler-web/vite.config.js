// course-scheduler-web/vite.config.js
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  base: '/CITUCourseBuilder/',
})