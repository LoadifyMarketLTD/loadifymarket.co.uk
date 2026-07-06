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
        background: "#F8FAFC",
        surface: "#17355F",
        elevated: "#0F2747",

        primary: "#26B982",
        "primary-hover": "#178F61",
        "primary-soft": "rgba(38,185,130,0.12)",

        secondary: "#17355F",
        accent: "#D4A017",
        admin: "#7C3AED",

        foreground: "#0F172A",
        "muted-foreground": "#64748B",

        border: "#E2E8F0",
        input: "#E2E8F0",
        ring: "#26B982",

        success: "#22C55E",
        warning: "#F59E0B",
        danger: "#D64545",

        card: "#FFFFFF",
        popover: "#FFFFFF",
        muted: "#F1F5F9",
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
        'cinematic': '0 25px 50px -12px rgba(23, 53, 95, 0.18)',
        'cinematic-lg': '0 35px 60px -15px rgba(23, 53, 95, 0.22)',
        'cinematic-gold': '0 25px 50px -12px rgba(212, 160, 23, 0.20)',
        'cinematic-blue': '0 25px 50px -12px rgba(23, 53, 95, 0.16)',
        'glass': '0 8px 32px 0 rgba(15, 23, 42, 0.08)',
        'premium-card': '0 12px 32px rgba(15,23,42,0.08)',
        'premium-hover': '0 18px 44px rgba(15,23,42,0.14)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-cinematic': 'linear-gradient(135deg, #F8FAFC 0%, #E8F7F2 45%, #EEF4FB 100%)',
        'gradient-gold': 'linear-gradient(135deg, #D4A017 0%, #F2C84B 100%)',
        'gradient-primary': 'linear-gradient(135deg, #17355F 0%, #26B982 100%)',
        'gradient-overlay': 'linear-gradient(to top, rgba(15, 23, 42, 0.82) 0%, rgba(15, 23, 42, 0.34) 50%, transparent 100%)',
        'gradient-overlay-light': 'linear-gradient(to top, rgba(15, 23, 42, 0.55) 0%, transparent 100%)',
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
          '0%': { boxShadow: '0 0 20px rgba(38, 185, 130, 0.35)' },
          '100%': { boxShadow: '0 0 50px rgba(38, 185, 130, 0.55)' },
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
