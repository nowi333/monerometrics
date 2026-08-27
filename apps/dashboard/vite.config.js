import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Le sitemap porte la date du build : figer un lastmod dans public/ le rend
// obsolete des le deploiement suivant.
const sitemap = () => ({
  name: 'sitemap',
  generateBundle() {
    const day = new Date().toISOString().slice(0, 10)
    this.emitFile({
      type: 'asset',
      fileName: 'sitemap.xml',
      source: `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://monerometrics.net/</loc>
    <lastmod>${day}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`,
    })
  },
})

export default defineConfig({
  plugins: [react(), tailwindcss(), sitemap()],
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
          if (id.includes('chart.js') || id.includes('react-chartjs-2') || id.includes('chartjs-plugin')) return 'charts'
          if (id.includes('i18next')) return 'i18n'
        },
      },
    },
  },
})
