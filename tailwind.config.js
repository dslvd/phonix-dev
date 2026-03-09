/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FF9A3C',
          dark: '#e8832a',
          light: '#FFB76B',
        },
        secondary: {
          DEFAULT: '#3DC8E8',
          dark: '#28b2d4',
        },
        success: '#4CC867',
        danger: '#FF4B4B',
        warning: '#FFF176',
        pink: {
          100: '#FFF0F5',
          200: '#FFD4E5',
          300: '#FFB8D6',
          400: '#FF9CC7',
          500: '#FF80B8',
        },
        sky: {
          100: '#E6F7FF',
          200: '#B3E5FF',
          300: '#80D3FF',
          400: '#4DC1FF',
          500: '#1AAFFF',
        },
      },
      fontFamily: {
        nunito: ['Nunito', 'sans-serif'],
        baloo: ['Baloo 2', 'cursive'],
      },
      animation: {
        'bounce-slow': 'bounce 2s infinite',
        'wiggle': 'wiggle 1s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'pop': 'pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        pop: {
          '0%': { transform: 'scale(0.85) translateY(28px)', opacity: '0' },
          '100%': { transform: 'scale(1) translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
