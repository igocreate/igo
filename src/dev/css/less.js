
'use strict';

var less  = require('gulp-less');


module.exports = {
  src:          './less/styles.less',
  watch:        './less/**/*.less',
  preprocessor: less
};
