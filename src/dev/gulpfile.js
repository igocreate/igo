'use strict';

var _           = require('lodash');
var async       = require('async');
var runSequence = require('run-sequence');

var nodemon     = require('gulp-nodemon');
var jshint      = require('gulp-jshint');
var stylish     = require('jshint-stylish');
var uglify      = require('gulp-uglify');
var concat      = require('gulp-concat');
var imagemin    = require('gulp-imagemin');
var fingerprint = require('gulp-finger');
var cleancss    = require('gulp-clean-css');
var gulpUtil    = require('gulp-util');
var livereload  = require('gulp-livereload');

//
var defaultOptions = {
  csspreprocessor: 'less',
  uglify: {
    src: [ './js/**/*.js' ]
  },
  jshint: {
    src: ['./app.js', './app/**/*.js'],
    options: {
      node:       true,
      camelcase:  false,
      esversion:  6
    }
  },
  imagemin: {
    src: [
      './public/**/*.png',
      './public/**/*.jpg',
      './public/**/*.jpeg',
      './public/**/*.gif'
    ]
  }
};

module.exports = function(gulp, options) {

  runSequence = runSequence.use(gulp);

  // load uglify config from /js/config.json
  try {
    defaultOptions.uglify = require(process.cwd() + '/js/config.json');
  } catch (err) {
    // ignored
  }

  options       = _.defaultsDeep(options, defaultOptions);
  var css       = options.csspreprocessor;
  options.css   = require('./css/' + css);
  options.copy  = _.merge(options.copy, options.css.copy);

  // uglify: minifies frontend js
  gulp.task('uglify', function() {
    return gulp.src(options.uglify.src)
      .pipe(concat('main.js'))
      .pipe(uglify({outSourceMaps: true}).on('error', function(err) {
        gulpUtil.log(err);
        return this.end();
      }))
      .pipe(fingerprint('./views/js.fingerprint'))
      .pipe(gulp.dest('./public'));
  });

  // css : preprocessing + cleancss
  gulp.task(css, function () {
    return gulp.src(options.css.src)
    .pipe(options.css.preprocessor())
    .pipe(cleancss())
    .pipe(fingerprint('./views/css.fingerprint'))
    .pipe(gulp.dest('./public'));
  });

  // jshint: verifies backend app js code
  gulp.task('jshint', function() {
    return gulp.src(options.jshint.src)
      .pipe(jshint(options.jshint.options))
      .pipe(jshint.reporter(stylish));
  });

  // imagemin: optimize images
  gulp.task('imagemin', function () {
    return gulp.src(options.imagemin.src)
      .pipe(imagemin())
      .pipe(gulp.dest('./public'));
  });

  // copy: copy files from bower_components
  gulp.task('copy', function(callback) {
    async.eachOfSeries(options.copy || {}, function(dest, src, callback) {
      gulp.src(src).pipe(gulp.dest(dest)).on('end', callback);
    }, callback);
  });

  // livereload
  gulp.task('livereload', function() {
    gulp.src('./app.js')
      .pipe(livereload());
  });

  // dev: nodemon
  gulp.task('dev', function() {

    livereload.listen();

    // watch
    gulp.watch('./app/**/*.js',       ['jshint']);
    gulp.watch('./js/**/*.js',        ['uglify']);
    gulp.watch(options.css.watch,     [css]);
    gulp.watch([
      './views/**/*.dust',
      './public/main.js',
      './public/styles.css'
    ],   ['livereload']);

    // nodemon
    nodemon({
      script: './app.js',
      ext: 'js,json',
      ignore: ['node_modules/', 'public/', 'js/', 'scss/', 'less/']
    }).on('restart', function() {
      setTimeout(function() {
        gulp.src('app.js').pipe(livereload());
      }, 2000);
    });

  });

  // default task
  gulp.task('default', function(callback) {
    // waiting for gulp 4
    runSequence('copy',
                [css, 'uglify', 'jshint', 'dev'],
                callback);
  });

};
