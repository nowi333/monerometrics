import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    // Decoupage manuel : on isole les grosses dependances dans des chunks
    // separes pour qu'elles soient mises en cache independamment du code applicatif.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('/react-dom/') || /\/react\//.test(id)) return 'react'
          if (id.includes('/d3')) return 'd3'
          if (id.includes('chart.js') || id.includes('react-chartjs-2')) return 'charts'
          if (id.includes('i18next')) return 'i18n'
        },
      },
    },
  },
})
