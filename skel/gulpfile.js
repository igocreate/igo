
'use strict';


var gulp = require('gulp');

var options = {
  csspreprocessor: 'sass',
  urglify: {
    src: [
      './js/jquery*.js',
      './js/bootstrap*.js',
      './js/plugins/**/*.js',
      './js/main.js'
    ]
  },
  copy: {
    './bower_components/font-awesome/fonts/*':            './public/fonts/',
    './bower_components/bootstrap/dist/fonts/*':          './public/fonts',
    './bower_components/jquery/dist/jquery.js':           './js',
    './bower_components/bootstrap/dist/js/bootstrap.js':  './js',
    './bower_components/font-awesome/scss/*':             './scss/font-awesome',
    './bower_components/bootstrap/scss/**/*':             './scss/bootstrap',
  }
};

require('igo').dev.setDefaultGulpTasks(gulp, options);
