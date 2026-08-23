import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Hidden source maps: generated but not referenced in output files,
    // so they are available for debugging/error-tracking without being
    // publicly discoverable via the browser DevTools Sources panel.
    sourcemap: 'hidden',
    // Enable code splitting
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks for better caching
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'vendor-ui': ['lucide-react', 'date-fns'],
          'vendor-payment': ['@stripe/stripe-js', '@stripe/react-stripe-js'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-utils': ['axios', 'zustand'],
        },
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 600,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      'zustand',
    ],
  },
})
