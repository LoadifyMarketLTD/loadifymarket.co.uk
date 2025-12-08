/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Legacy navy colors (keeping for backward compatibility)
        navy: {
          50: '#f0f4f8',
          100: '#d9e2ec',
          200: '#bcccdc',
          300: '#9fb3c8',
          400: '#829ab1',
          500: '#627d98',
          600: '#486581',
          700: '#334e68',
          800: '#243b53',
          900: '#102a43',
          950: '#0A0A0A', // Jet Black for cinematic
        },
        // New Cinematic Gold Accent
        gold: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#D4AF37', // Primary Gold Accent
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        // New Cinematic Color Palette
        jet: '#0A0A0A',           // Jet Black
        graphite: '#2E2E2E',      // Graphite Gray
        smoke: '#F2F2F2',         // Light Smoke
      },
      borderRadius: {
        'cinematic-sm': '12px',
        'cinematic-md': '20px',
        'cinematic-lg': '32px',
      },
      boxShadow: {
        'cinematic': '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        'cinematic-lg': '0 35px 60px -15px rgba(0, 0, 0, 0.6)',
        'cinematic-glow': '0 0 30px rgba(212, 175, 55, 0.3)',
      },
      backdropBlur: {
        'cinematic': '16px',
      },
      fontFamily: {
        'display': ['Inter', 'SF Pro Display', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
