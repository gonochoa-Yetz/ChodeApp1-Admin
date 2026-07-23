import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base must match the GitHub Pages repo path (e.g. /ChodeApp1-Admin/) once deployed.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/ChodeApp1-Admin/' : '/',
}))
