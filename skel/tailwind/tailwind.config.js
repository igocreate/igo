/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'dark',
  content: ['./views/**/*.{html,dust}'],
  plugins: [
    require('daisyui')
  ],
  daisyui: {
    themes: [
      {
        light: {
          ...require('daisyui/src/theming/themes')['[data-theme=light]'],
          'primary': '#345dfa',
          // ... other color overrides
        },
      },
    ],
  },
  theme: {
    extend: {
      colors: {
        'certigo-dark': '#13253d',
      }
    }
  }
};

