/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#6B21A8', // Morado de CokieCollege (Ejemplo)
        secondary: '#F59E0B', // Ambar/Naranja (Ejemplo)
      }
    },
  },
  plugins: [],
}
