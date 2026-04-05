/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        primary: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        accent: {
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
        }
      },
      backgroundImage: {
        'auth-gradient': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'btn-gradient':  'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        'btn-gradient-hover': 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
      },
      boxShadow: {
        'glow':    '0 0 20px rgba(99,102,241,0.35)',
        'glow-lg': '0 0 40px rgba(99,102,241,0.25)',
        'card':    '0 8px 32px rgba(0,0,0,0.12)',
        'input':   '0 2px 8px rgba(99,102,241,0.15)',
      },
      animation: {
        'fade-in':    'fadeIn 0.4s ease-out',
        'slide-up':   'slideUp 0.4s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'spin-slow':  'spin 1.5s linear infinite',
        'shimmer':    'shimmer 1.6s ease-in-out infinite',
        'like':       'likePopIn 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        'fade-up':    'fadeUp 0.3s ease-out both',
      },
      keyframes: {
        fadeIn:     { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp:    { '0%': { opacity: '0', transform: 'translateY(16px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        shimmer:    { '0%': { backgroundPosition: '100% 50%' }, '100%': { backgroundPosition: '0% 50%' } },
        likePopIn:  { '0%': { transform: 'scale(1)' }, '40%': { transform: 'scale(1.4)' }, '70%': { transform: 'scale(0.9)' }, '100%': { transform: 'scale(1)' } },
        fadeUp:     { 'from': { opacity: '0', transform: 'translateY(8px)' }, 'to': { opacity: '1', transform: 'translateY(0)' } },
      },
      backdropBlur: { xs: '2px' },
    },
  },
  plugins: [],
}
