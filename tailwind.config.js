/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,html}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Microsoft JhengHei', 'sans-serif'],
      }
    }
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
