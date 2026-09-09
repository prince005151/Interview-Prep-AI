/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef6ff',
          500: '#2563eb',
          600: '#1d4ed8',
        },
      },
      boxShadow: {
        soft: '0 10px 30px rgba(37, 99, 235, 0.12)',
      },
    },
  },
  plugins: [],
}

