/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  plugins: [react()],
  // three.js steckt nur im (nachgeladenen) Schattenlabor-Teil
  build: { chunkSizeWarningLimit: 700 },
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
})
