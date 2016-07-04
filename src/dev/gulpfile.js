'use strict';


var nodemon     = require('gulp-nodemon');
var jshint      = require('gulp-jshint');
var stylish     = require('jshint-stylish');
var uglify      = require('gulp-uglify');
var concat      = require('gulp-concat');
var sass        = require('gulp-sass');
var less        = require('gulp-less');
var imagemin    = require('gulp-imagemin');
var fingerprint = require('gulp-finger');
var minifycss   = require('gulp-minify-css');
var gulpUtil    = require('gulp-util');

module.exports = function(gulp) {

  // uglify
  gulp.task('uglify', function() {
    return gulp.src([
        './js/jquery-*.js',
        './js/bootstrap.*.js',
        './js/plugins/**/*.js',
        './js/main.js',
        './js/**/*.js' ])
      .pipe(concat('main.js'))
      .pipe(uglify({outSourceMaps: true}).on('error', gulpUtil.log))
      .pipe(fingerprint('./views/js.fingerprint'))
      .pipe(gulp.dest('./public'));
  });


  // scss + minifycss
  gulp.task('scss', function () {
    return gulp.src('./scss/styles.scss')
      .pipe(sass().on('error', gulpUtil.log))
      .pipe(minifycss())
      .pipe(fingerprint('./views/css.fingerprint'))
      .pipe(gulp.dest('./public'));
  });

  // less + minifycss
  gulp.task('less', function () {
    return gulp.src('./less/styles.less')
      .pipe(less().on('error', gulpUtil.log))
      .pipe(minifycss())
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

  // test: mocha
  // gulp.task('test', function () {
  //   return gulp.src('./test/**/*.js')
  //     .pipe(mocha({
  //       reporter: 'list'
  //     }));
  // });

  // dev: nodemon
  gulp.task('dev', function () {

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
  gulp.task('default', ['less', 'uglify', 'jshint', 'dev']);

};
