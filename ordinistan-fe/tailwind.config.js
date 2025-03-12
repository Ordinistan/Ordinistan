/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        core: {
          primary: '#F7931A',    // Bitcoin orange
          secondary: '#9945FF',  // Purple accent
          dark: '#0A0A0F',      // Deep background
          darker: '#050507',     // Darker elements
          light: '#FFFFFF',     
          accent: '#F7931A',    
          surface: '#12121A',   // Card background
          muted: '#9BA1A6',     // Muted text
          'glass-light': 'rgba(255, 255, 255, 0.03)',
          'glass-dark': 'rgba(10, 10, 15, 0.95)',
          'card': '#15151F',    
        },
        gradient: {
          start: '#F7931A',
          middle: '#FF8E2D',
          end: '#9945FF',
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(circle at center, var(--tw-gradient-stops))',
        'hero-pattern': "url('/grid-pattern.svg')",
        'card-gradient': 'linear-gradient(135deg, rgba(247, 147, 26, 0.1), rgba(153, 69, 255, 0.1))',
        'page-gradient': 'linear-gradient(to bottom, rgb(10, 10, 15), rgb(5, 5, 7))',
        'glow-gradient': 'radial-gradient(circle at center, rgba(247, 147, 26, 0.15), transparent 50%)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
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
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'neon': '0 0 20px rgba(255, 51, 102, 0.3)',
        'neon-purple': '0 0 20px rgba(153, 51, 255, 0.3)',
        'inner-glow': 'inset 0 0 20px rgba(255, 51, 102, 0.2)',
      },
    },
  },
  plugins: [],
} 