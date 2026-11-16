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
          bg: '#F4F8FD',
          card: '#FFFFFF',
          border: '#E2E8F0',
          primary: '#004890',
          'primary-hover': '#003770',
          'primary-light': '#EBF3FC',
          accent: '#208C58',
          secondary: '#0EA5E9',
          gold: '#C59B27',
          dark: '#0F172A',
          muted: '#64748B',
        },
        brand: {
          50: '#F0F6FC',
          100: '#DEEAF6',
          200: '#BAE6FD',
          300: '#7DD3FC',
          400: '#0EA5E9',
          500: '#004890',
          600: '#003B75',
          700: '#002D5A',
          800: '#001F3E',
          900: '#001224',
        },
      },
      fontFamily: {
        sans: ['Be Vietnam Pro', 'Roboto', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 2px 10px -2px rgba(0, 72, 144, 0.05), 0 1px 3px -1px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 10px 25px -5px rgba(0, 72, 144, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
      }
    },
  },
  plugins: [],
}
