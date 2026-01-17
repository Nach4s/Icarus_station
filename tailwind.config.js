/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./frontend/index.html",
    "./frontend/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Main space theme colors
        'space': {
          'dark': '#030712',
          'darker': '#010409',
          'card': 'rgba(15, 23, 42, 0.7)',
          'border': 'rgba(56, 189, 248, 0.2)',
        },
        // Primary accent (cyan/teal)
        'primary': {
          DEFAULT: '#38bdf8',
          'light': '#7dd3fc',
          'dark': '#0284c7',
          'glow': 'rgba(56, 189, 248, 0.4)',
        },
        // Status colors
        'status': {
          'nominal': '#22c55e',
          'warning': '#eab308',
          'critical': '#ef4444',
        },
        // Legacy support
        'space-dark': '#030712',
        'space-blue': '#1e3a8a',
        'space-cyan': '#38bdf8',
        'nasa-red': '#fc3d21',
        'nasa-blue': '#0b3d91',
      },
      fontFamily: {
        'display': ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
        'sans': ['Inter', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'Courier New', 'monospace'],
      },
      backgroundImage: {
        'space-gradient': 'radial-gradient(ellipse at bottom, #1b2735 0%, #090a0f 100%)',
        'card-gradient': 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(15, 23, 42, 0.4) 100%)',
        'glow-gradient': 'radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, transparent 70%)',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glow': '0 0 20px rgba(56, 189, 248, 0.3)',
        'glow-lg': '0 0 40px rgba(56, 189, 248, 0.4)',
        'inner-glow': 'inset 0 0 20px rgba(56, 189, 248, 0.1)',
      },
      backdropBlur: {
        'glass': '16px',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'slide-up': 'slide-up 0.5s ease-out',
        'fade-in': 'fade-in 0.5s ease-out',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'orbit': 'orbit 20s linear infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(56, 189, 248, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(56, 189, 248, 0.6)' },
        },
        'orbit': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
    },
  },
  plugins: [],
}
