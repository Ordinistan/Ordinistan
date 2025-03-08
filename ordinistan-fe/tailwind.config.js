/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        core: {
          primary: '#1E40AF',    // Core Chain blue
          secondary: '#6366F1',  // Indigo accent
          dark: '#0F172A',       // Dark background
          light: '#F1F5F9',      // Light background
          accent: '#7C3AED',     // Purple accent
          surface: '#FFFFFF',    // Surface color
          muted: '#94A3B8',     // Muted text
          'glass-light': 'rgba(255, 255, 255, 0.1)',
          'glass-dark': 'rgba(15, 23, 42, 0.8)',
          'bg-light': '#F8FAFC',  // Softer background
        },
        gradient: {
          start: '#1E40AF',
          middle: '#3B82F6',
          end: '#6366F1',
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-pattern': "url('/grid-pattern.svg')",
        'card-gradient': 'linear-gradient(45deg, rgba(30, 64, 175, 0.05), rgba(99, 102, 241, 0.05))',
        'page-gradient': 'linear-gradient(to bottom, rgb(241, 245, 249), rgb(248, 250, 252))',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.6 },
        },
        fadeIn: {
          '0%': { 
            opacity: '0',
            transform: 'translateY(20px)'
          },
          '100%': { 
            opacity: '1',
            transform: 'translateY(0)'
          },
        },
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        'neon': '0 0 20px rgba(99, 102, 241, 0.3)',
      },
    },
  },
  plugins: [],
} 