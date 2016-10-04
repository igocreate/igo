'use strict';

var _           = require('lodash');
var async       = require('async');
var runSequence = require('run-sequence');

var nodemon     = require('gulp-nodemon');
var jshint      = require('gulp-jshint');
var stylish     = require('jshint-stylish');
var uglify      = require('gulp-uglify');
var concat      = require('gulp-concat');
var sass        = require('gulp-sass');
var less        = require('gulp-less');
var imagemin    = require('gulp-imagemin');
var fingerprint = require('gulp-finger');
var cleancss    = require('gulp-clean-css');
var gulpUtil    = require('gulp-util');

//
var defaultOptions = {
  uglify: {
    src: [
      './js/jquery*.js',
      './js/bootstrap*.js',
      './js/plugins/**/*.js',
      './js/main.js',
      './js/**/*.js'
    ]
  },
  copy: {
    './bower_components/font-awesome/fonts/*':            './public/fonts/',
    './bower_components/bootstrap/dist/fonts/*':          './public/fonts',
    './bower_components/jquery/dist/jquery.js':           './js',
    './bower_components/bootstrap/dist/js/bootstrap.js':  './js',
    './bower_components/bootstrap/less/**/*':             './less/bootstrap',
  }
};

module.exports = function(gulp, options) {

  runSequence = runSequence.use(gulp);

  options     = _.defaultsDeep(options, defaultOptions);

  // uglify
  gulp.task('uglify', function() {
    return gulp.src(options.uglify.src)
      .pipe(concat('main.js'))
      .pipe(uglify({outSourceMaps: true}).on('error', gulpUtil.log))
      .pipe(fingerprint('./views/js.fingerprint'))
      .pipe(gulp.dest('./public'));
  });


  // scss + cleancss
  gulp.task('scss', function () {
    return gulp.src('./scss/styles.scss')
      .pipe(sass().on('error', gulpUtil.log))
      .pipe(cleancss())
      .pipe(fingerprint('./views/css.fingerprint'))
      .pipe(gulp.dest('./public'));
  });

  // less + cleancss
  gulp.task('less', function () {
    return gulp.src('./less/styles.less')
      .pipe(less().on('error', gulpUtil.log))
      .pipe(cleancss())
      .pipe(fingerprint('./views/css.fingerprint'))
      .pipe(gulp.dest('./public'));
  });

  // jshint
  gulp.task('jshint', function() {

    var jshintOptions = {
      node: true,
      camelcase: false,
      esversion: 6
    };
    return gulp.src(['./app.js', './app/**/*.js'])
      .pipe(jshint(jshintOptions))
      .pipe(jshint.reporter(stylish));
  });

  // imagemin
  gulp.task('imagemin', function () {
    return gulp.src([
        './public/**/*.png',
        './public/**/*.jpg',
        './public/**/*.jpeg',
        './public/**/*.gif' ])
      .pipe(imagemin())
      .pipe(gulp.dest('./public'));
  });

  // copy files from bower_components
  gulp.task('copy', function(callback) {
    async.eachOfSeries(options.copy, function(dest, src, callback) {
      gulp.src(src).pipe(gulp.dest(dest)).on('end', callback);
    }, callback);
  });

  // dev: nodemon
  gulp.task('dev', function() {

    // watch
    gulp.watch('./app/**/*.js',       ['jshint']);
    gulp.watch('./js/**/*.js',        ['uglify']);
    gulp.watch('./scss/**/*.scss',    ['scss']);
    gulp.watch('./less/**/*.less',    ['less']);
    // gulp.watch('./test/**/*.js',            ['test']);

    // nodemon
    nodemon({
      script: './app.js',
      ext: 'js,json',
      ignore: ['node_modules/', 'public/', 'js/', 'scss/', 'less/']
    });

  });

  // default task
  gulp.task('default', function(callback) {
    // waiting for gulp 4
    runSequence('copy',
                ['less', 'uglify', 'jshint', 'dev'],
                callback);
  });

};
