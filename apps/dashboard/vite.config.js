import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('/react-dom/') || /\/react\//.test(id)) return 'react'
          if (id.includes('/d3')) return 'd3'
          // Chart.js n'est plus regroupe a part : en chunk nomme il etait
          // precharge avec la page, alors que plus aucun panneau visible d'emblee
          // ne s'en sert. Laisse libre, il part avec le premier graphique demande.
          if (id.includes('i18next')) return 'i18n'
        },
      },
    },
  },
})
