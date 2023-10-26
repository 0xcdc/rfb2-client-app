import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [preact()],
  build: {
    target: 'esnext',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        heatmap: resolve(__dirname, 'heatmap/heatmap.html'),
      },
      /**
       * Ignore "use client" waning since we are not using SSR
       * @see {@link https://github.com/TanStack/query/pull/5161#issuecomment-1477389761 Preserve 'use client' directives TanStack/query#5161}
       */
      onwarn(warning, warn) {
        if (
          warning.code === "MODULE_LEVEL_DIRECTIVE" &&
          warning.message.includes(`"use client"`)
        ) {
          return;
        }
        warn(warning);
      },
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/graphQL': 'http://localhost:4000',
    },
  }
})
