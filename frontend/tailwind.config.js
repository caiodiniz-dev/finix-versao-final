const plugin = require('tailwindcss/plugin');

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
          light: '#F3F7FF',
          soft: '#E0E7FF',
        },
        surface: 'var(--color-surface)',
        'surface-strong': 'var(--color-surface-strong)',
        background: 'var(--color-background)',
        border: 'var(--color-border)',
        'border-strong': 'var(--color-border-strong)',
        text: 'var(--color-text)',
        muted: 'var(--color-text-muted)',
        'text-low': 'var(--color-text-low)',
        primary: 'var(--color-primary)',
        'primary-soft': 'var(--color-primary-soft)',
        secondary: 'var(--color-secondary)',
        overlay: 'var(--color-overlay)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 24px 80px -32px rgba(15, 23, 42, 0.12)',
        glow: '0 14px 40px -12px rgba(37, 99, 235, 0.35)',
        '3d': '0 28px 110px -36px rgba(15, 23, 42, 0.18)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        float: 'float 6s ease-in-out infinite',
        'flip-3d': 'flip3d 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'rotate-3d': 'rotate3d 20s linear infinite',
        tilt: 'tilt 4s ease-in-out infinite',
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
    plugin(function ({ addUtilities }) {
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
