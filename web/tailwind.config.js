/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: '#0B1957',
        blue_custom: '#426bc2',
        lilac: '#E8D9ED',
        cream: '#F7F4ED',
        muted: '#8a94b2',
        good: '#2ecc71',
        mid: '#f39c12',
        bad: '#e74c3c',
        'good-bg': '#eafaf1',
        'mid-bg': '#fef9ec',
        'bad-bg': '#fdf0ef',
      },
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
