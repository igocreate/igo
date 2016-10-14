
'use strict';

var sass  = require('gulp-sass');


module.exports = {
  src:          './scss/styles.scss',
  watch:        './scss/**/*.scss',
  preprocessor: sass
};
