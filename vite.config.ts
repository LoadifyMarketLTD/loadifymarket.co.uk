/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { configDefaults } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@/assets/loadify-logo.svg': path.resolve(__dirname, './src/assets/LOGO.png'),
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    exclude: [...configDefaults.exclude, 'e2e/**'],
    typecheck: {
      tsconfig: './tsconfig.test.json',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/lib/**', 'netlify/functions/**'],
      exclude: ['src/lib/mocks/**', 'src/lib/supabase.ts', 'src/lib/stripe.ts'],
    },
  },
  build: {
    // Use terser for better dead-code elimination and smaller output than esbuild.
    // Benchmark: terser produces ~3-4 kB less gzip across critical-path chunks
    // (vendor-react, vendor-forms, index.js) compared to esbuild default.
    minify: 'terser',
    terserOptions: {
      compress: {
        // Drop console.log/info/debug calls in production; keep warn/error for
        // operational visibility (service-worker failures, Stripe key warnings).
        drop_console: false,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
        passes: 2,
      },
    },
    // No source maps in production — keeps the APK smaller and avoids
    // shipping source code inside the distributed binary.
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core framework — loaded on every page
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Heavy form / validation stack — only needed on form pages
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          // UI utilities
          'vendor-ui': ['lucide-react', 'date-fns'],
          // Stripe — only needed on checkout/seller pages
          'vendor-payment': ['@stripe/stripe-js', '@stripe/react-stripe-js'],
          // Supabase client — large; isolated so it caches independently
          'vendor-supabase': ['@supabase/supabase-js'],
          // Remaining utilities
          'vendor-utils': ['axios', 'zustand'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  // Pre-bundle synchronous dependencies for faster cold-start in dev
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
