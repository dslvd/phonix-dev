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
          DEFAULT: '#FF9126',
          dark: '#e67f14',
          light: '#ffb05f',
        },
        secondary: {
          DEFAULT: '#2FC0E1',
          dark: '#17a8ca',
          light: '#7fd8ee',
        },
        success: '#4CC867',
        danger: '#FF4B4B',
        warning: '#FFFEA7',
        cream: {
          DEFAULT: '#EBEBEB',
          dark: '#dcdcdc',
          light: '#f5f5f5',
        },
        pink: {
          100: '#fff3e8',
          200: '#ffe1c2',
          300: '#ffd09b',
          400: '#ffc075',
          500: '#ffb05f',
        },
        sky: {
          100: '#eefbfd',
          200: '#cceff7',
          300: '#9be1ef',
          400: '#63d1e8',
          500: '#2FC0E1',
        },
        yellow: {
          100: '#fffef0',
          200: '#fffcd4',
          300: '#fffabf',
          400: '#fff8b1',
          500: '#FFFEA7',
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
