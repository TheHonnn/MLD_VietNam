/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        spa: {
          bg: '#FAF7F2',
          card: '#FFFFFF',
          border: '#EFE7DC',
          primary: '#9A643A',
          'primary-hover': '#85522C',
          'primary-light': '#F7EFE7',
          accent: '#D4A373',
          gold: '#C59B27',
          dark: '#2C241E',
          muted: '#7E7369',
        },
        brand: {
          50: '#FBF8F5',
          100: '#F7EFE7',
          200: '#EBDCCE',
          300: '#DCC3AB',
          400: '#B88B63',
          500: '#9A643A',
          600: '#85522C',
          700: '#6D4122',
          800: '#54321A',
          900: '#3D2413',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 2px 10px -2px rgba(154, 100, 58, 0.05), 0 1px 3px -1px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 10px 25px -5px rgba(154, 100, 58, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
      }
    },
  },
  plugins: [],
}
