/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {
    colors: {
      navy: { 950: '#0B1426', 900: '#101D35', 800: '#172945', 700: '#243B5C' },
      accent: '#3478F6',
      canvas: '#F5F7FB'
    },
    fontFamily: { sans: ['DM Sans', 'sans-serif'], display: ['Plus Jakarta Sans', 'sans-serif'] }
  }},
  plugins: []
}