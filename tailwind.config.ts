import type { Config } from 'tailwindcss'
import tailwindcssAnimate from 'tailwindcss-animate'

export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        background: "#0A0E1A",
        surface: "#121A2B",
        elevated: "#182235",

        primary: "#D4AF37",
        "primary-hover": "#C69B2D",
        "primary-soft": "rgba(212,175,55,0.15)",

        secondary: "#2E4F9B",
        accent: "#1F8A70",
        admin: "#7C3AED",

        foreground: "#F5F7FA",
        "muted-foreground": "#A7B0C0",

        border: "#2A344A",
        input: "#2A344A",
        ring: "#D4AF37",

        success: "#22C55E",
        warning: "#F59E0B",
        danger: "#D64545",

        card: "#121A2B",
        popover: "#182235",
        muted: "#121A2B",
        destructive: "#D64545",
      },
      fontFamily: {
        display: ['Inter', 'SF Pro Display', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'Avenir', 'Helvetica', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        'premium-sm': '12px',
        'premium-md': '20px',
        'premium-lg': '32px',
      },
      boxShadow: {
        'cinematic': '0 25px 50px -12px rgba(212, 175, 55, 0.25)',
        'cinematic-lg': '0 35px 60px -15px rgba(212, 175, 55, 0.35)',
        'cinematic-gold': '0 25px 50px -12px rgba(212, 175, 55, 0.25)',
        'cinematic-blue': '0 25px 50px -12px rgba(212, 175, 55, 0.15)',
        'glass': '0 8px 32px 0 rgba(212, 175, 55, 0.15)',
        'premium-card': '0 10px 40px rgba(0,0,0,0.6)',
        'premium-hover': '0 0 20px rgba(212,175,55,0.15), 0 10px 40px rgba(0,0,0,0.8)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-cinematic': 'linear-gradient(135deg, #0A0E1A 0%, #182235 50%, #0A0E1A 100%)',
        'gradient-gold': 'linear-gradient(135deg, #C69B2D 0%, #D4AF37 100%)',
        'gradient-primary': 'linear-gradient(135deg, #C69B2D 0%, #D4AF37 100%)',
        'gradient-overlay': 'linear-gradient(to top, rgba(10, 14, 26, 0.95) 0%, rgba(10, 14, 26, 0.5) 50%, transparent 100%)',
        'gradient-overlay-light': 'linear-gradient(to top, rgba(10, 14, 26, 0.8) 0%, transparent 100%)',
      },
      backdropBlur: {
        'glass': '20px',
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "count-up": "count-up 0.5s ease-out forwards",
        'fade-in': 'fadeIn 0.6s ease-out',
        'fade-in-up': 'fadeInUp 0.8s ease-out',
        'scale-in': 'scaleIn 0.5s ease-out',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "count-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        glow: {
          /* gold accent: #D4AF37 = rgb(212, 175, 55) */
          '0%': { boxShadow: '0 0 20px rgba(212, 175, 55, 0.4)' },
          '100%': { boxShadow: '0 0 50px rgba(212, 175, 55, 0.7)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config
