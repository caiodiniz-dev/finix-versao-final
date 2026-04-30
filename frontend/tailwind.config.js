/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: '#2563EB',
          purple: '#7C3AED',
          green: '#22C55E',
          dark: '#0F172A',
          light: '#F1F5F9',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 4px 24px -6px rgba(15, 23, 42, 0.08)',
        glow: '0 10px 40px -10px rgba(37, 99, 235, 0.45)',
        '3d': '0 20px 60px -20px rgba(0, 0, 0, 0.3)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'flip-3d': 'flip3d 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'rotate-3d': 'rotate3d 20s linear infinite',
        'tilt': 'tilt 4s ease-in-out infinite',
        'bounce-slow': 'bounce 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        slideUp: { '0%': { opacity: 0, transform: 'translateY(12px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        flip3d: {
          '0%': { transform: 'rotateY(0deg)' },
          '100%': { transform: 'rotateY(360deg)' },
        },
        rotate3d: {
          '0%': { transform: 'rotateX(0deg) rotateY(0deg) rotateZ(0deg)' },
          '100%': { transform: 'rotateX(360deg) rotateY(360deg) rotateZ(360deg)' },
        },
        tilt: {
          '0%, 100%': { transform: 'rotate(-2deg)' },
          '50%': { transform: 'rotate(2deg)' },
        },
      },
      perspective: {
        '1000': '1000px',
      },
    },
  },
  plugins: [
    require('tailwindcss').plugin(function ({ addUtilities }) {
      addUtilities({
        '.preserve-3d': { 'transform-style': 'preserve-3d' },
        '.perspective': { perspective: '1000px' },
        '.perspective-1200': { perspective: '1200px' },
        '.backface-hidden': { 'backface-visibility': 'hidden' },
        '.rotate-x-12': { transform: 'rotateX(12deg)' },
        '.rotate-y-12': { transform: 'rotateY(12deg)' },
        '.rotate-z-2': { transform: 'rotateZ(2deg)' },
      });
    }),
  ],
};
