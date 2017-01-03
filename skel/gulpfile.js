
'use strict';


var gulp = require('gulp');

var options = {
  csspreprocessor: 'sass',
  copy: {
    './bower_components/font-awesome/fonts/*':            './public/fonts/',
    './bower_components/bootstrap/dist/fonts/*':          './public/fonts'
  }
};

require('igo').dev.setDefaultGulpTasks(gulp, options);
