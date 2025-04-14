import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  const config = {
    plugins: [react()],
    base: '/', // Default base path
  }

  // Set base path only for production build, matching your GitHub repo name
  if (command === 'build') {
    config.base = '/CITCourseBuilder/' // <-- CHANGE THIS TO YOUR REPO NAME
  }

  return config
})