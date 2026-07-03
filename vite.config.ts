import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig({
    server: {
    proxy: {
      // Mọi request /api/bills → Rails :8084, đổi tên thành /recurring
      // (rule cụ thể phải đặt TRƯỚC rule catch-all /api)
      '/api/bills': {
        target: 'http://localhost:8084',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/bills/, '/recurring'),
      },
      // Các API còn lại (/api/auth, /api/insight, ...) → Rails, bỏ tiền tố /api.
      // Endpoint Rails chưa có (accounts, dashboard...) sẽ trả 404 rõ ràng.
      '/api': {
        target: 'http://localhost:8084',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  plugins: [
    figmaAssetResolver(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['pwa-icon.svg'],
      manifest: {
        name: 'MoneyFlow — Quản lý chi tiêu',
        short_name: 'MoneyFlow',
        description: 'Ứng dụng quản lý chi tiêu cá nhân',
        theme_color: '#9333ea',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        lang: 'vi',
        icons: [
          { src: 'pwa-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // Chỉ precache app shell (asset đã build). KHÔNG cache /api/ để tránh
        // lưu dữ liệu tài chính dạng plaintext trong Cache Storage.
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/],
        // Không khai báo runtimeCaching cho API — request tới gateway (origin
        // khác) sẽ đi thẳng ra mạng, không qua service worker.
      },
    }),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
