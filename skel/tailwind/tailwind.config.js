/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'dark',
  content: ['./views/**/*.{html,dust}'],
  plugins: [
  ],
  theme: {
    extend: {
      colors: {
        'certigo-dark': '#13253d',
      }
    }
  }
};

