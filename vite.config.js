import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [preact()],
  build: {
    target: 'esnext',
  },
  server: {
    port: 3000,
    proxy: {
      '/graphQL': 'http://localhost:4000',
    },
  }
})
