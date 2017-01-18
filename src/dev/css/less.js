
'use strict';

var less      = require('gulp-less');
var gulpUtil  = require('gulp-util');


module.exports = {
  src:          './less/styles.less',
  watch:        './less/**/*.less',
  preprocessor: function() {
    return less().on('error', function(err) {
      gulpUtil.log(err);
      return this.end();
    });
  }
};
