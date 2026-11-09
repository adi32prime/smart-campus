/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // <-- THIS IS THE ONLY NEW LINE
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};