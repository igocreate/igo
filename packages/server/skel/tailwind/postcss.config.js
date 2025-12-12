module.exports = {
  plugins: {
    '@tailwindcss/postcss': {
      // Specify the paths to all of your template files
      content: [
        './views/**/*.dust',
        './js/**/*.js',
      ],
    },
    autoprefixer: {},
  },
};