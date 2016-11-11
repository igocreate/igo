
'use strict';


var gulp = require('gulp');

var options = {
  csspreprocessor: 'sass',
  urglify: {
    src: [
      './js/plugins/**/*.js',
      './js/main.js',
      './js/**/*.js'
    ]
  },
  copy: {
    './bower_components/font-awesome/fonts/*':            './public/fonts/',
    './bower_components/bootstrap/dist/fonts/*':          './public/fonts'
  }
};

require('igo').dev.setDefaultGulpTasks(gulp, options);
