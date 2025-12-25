/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Iowan Old Style"', 'Georgia', '"Times New Roman"', 'Times', 'serif'],
      },
      colors: {
        primary: {
          50: '#fdf4f3',
          100: '#fce8e6',
          200: '#f9d4d1',
          300: '#f4b5af',
          400: '#ec8b82',
          500: '#e06459',
          600: '#cb4639',
          700: '#aa382d',
          800: '#8d3129',
          900: '#762e28',
          950: '#401511',
        },
      },
    },
  },
  plugins: [],
}

