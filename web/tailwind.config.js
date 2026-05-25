/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: '#0B1956',
        primary: '#0B1956',
        'primary-light': '#426bc2',
        'primary-dark': '#0a1540',
        lilac: '#E8D9ED',
        cream: '#F7F4ED',
        'app-bg': '#F5F7FA',
        muted: '#8a8da0',
        good: '#4CAF50',
        mid: '#f39c12',
        bad: '#e74c3c',
        'good-bg': '#eafaf1',
        'mid-bg': '#fef9ec',
        'bad-bg': '#fdf0ef',
      },
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 4px 8px rgba(11, 25, 86, 0.05)',
        'elevated': '0 10px 20px rgba(11, 25, 86, 0.1)',
      }
    },
  },
  plugins: [],
}

