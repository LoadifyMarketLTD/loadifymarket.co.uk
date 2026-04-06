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
        // ── shadcn/ui CSS-variable tokens ────────────────────────────────
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          dark: "hsl(var(--primary-dark))",
          light: "hsl(var(--primary-light))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        surface: "hsl(var(--surface))",
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // ── Brand palette ────────────────────────────────────────────────
        // Brand Green (primary actions)
        'brand-green': {
          DEFAULT: '#22C55E',
          hover: '#16A34A',
          light: '#DCFCE7',
          dark: '#15803D',
        },
        // Brand Purple (secondary / accents)
        'brand-purple': {
          DEFAULT: '#7C3AED',
          hover: '#5B21B6',
          light: '#EDE9FE',
          dark: '#4C1D95',
        },
        smoke: {
          DEFAULT: '#F2F2F2',
          50: '#FFFFFF',
          100: '#FAFAFA',
          200: '#F7F7F7',
          300: '#F2F2F2',
          400: '#E8E8E8',
          500: '#DEDEDE',
          600: '#D4D4D4',
          700: '#C7C7C7',
          800: '#B8B8B8',
          900: '#A8A8A8',
        },
        // Marketplace navy (header/footer)
        navy: {
          DEFAULT: '#1E3A5F',
          light: '#2C4E73',
          dark: '#152D4A',
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
        },
        // Marketplace section backgrounds
        marketplace: '#F5F6F7',
        'section-light': '#F8F9FA',
        // Deal badge orange
        'deal-orange': '#C2410C',
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
        'cinematic': '0 25px 50px -12px rgba(34, 197, 94, 0.25)',
        'cinematic-lg': '0 35px 60px -15px rgba(34, 197, 94, 0.35)',
        'cinematic-gold': '0 25px 50px -12px rgba(124, 58, 237, 0.25)',
        'cinematic-blue': '0 25px 50px -12px rgba(34, 197, 94, 0.25)',
        'glass': '0 8px 32px 0 rgba(34, 197, 94, 0.2)',
        'premium-card': '0 20px 40px rgba(15, 45, 82, 0.15)',
        'premium-hover': '0 30px 60px rgba(15, 45, 82, 0.2)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-cinematic': 'linear-gradient(135deg, #0F172A 0%, #1E3A5F 50%, #0F172A 100%)',
        'gradient-gold': 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)',
        'gradient-primary': 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
        'gradient-overlay': 'linear-gradient(to top, rgba(15, 45, 82, 0.95) 0%, rgba(15, 45, 82, 0.5) 50%, transparent 100%)',
        'gradient-overlay-light': 'linear-gradient(to top, rgba(15, 45, 82, 0.8) 0%, transparent 100%)',
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
          /* primary color: #22C55E = rgb(34, 197, 94) */
          '0%': { boxShadow: '0 0 20px rgba(34, 197, 94, 0.4)' },
          '100%': { boxShadow: '0 0 50px rgba(34, 197, 94, 0.7)' },
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
