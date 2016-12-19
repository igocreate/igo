
# Development

Igo uses [Bower](https://bower.io/) to manage frontend dependencies, and [Gulp](http://gulpjs.com/) to handle the development workflow.


## Bower

Modify the `/bower.json` file, and run `bower install`.
The components will be downloaded in the `/bower_components` directory.

## Gulp

The local `gulpfile.js` can be as short as:
```js
var gulp = require('gulp');
require('igo').dev.setDefaultGulpTasks(gulp);
```

The default Gulp tasks defined by Igo include Nodemon, JSHint, Uglify, CSS pre-processing, copying and Livereload.

### Nodemon

[gulp-nodemon](https://github.com/JacksonGariety/gulp-nodemon) watches your application files (`/app/**/*.js`) and restarts node as soon as a file is modified.

### JSHint

[gulp-jshint](https://github.com/spalger/gulp-jshint) runs the JSHint code quality tool on the application files (`/app/**/*.js`).

### Uglify

[gulp-uglify](https://github.com/terinjokes/gulp-uglify) runs UglifyJS on the frontend JS files (`/js/**/*.js`) and generate the `/public/main.js` file.


### CSS pre-processing

The [Less](http://lesscss.org/) and [Sass](http://sass-lang.com/) CSS pre-processors are integrated in the default Gulp tasks.

The chosen preprocessor will generate the `/public/styles.css` file from the `/less/styles.less` or `/scss/styles.scss` files

Configure your preferred preprocessor with this parameter:
```js
var options = {
  csspreprocessor: 'less' // or 'sass'
  //...
};
require('igo').dev.setDefaultGulpTasks(gulp, options);
```

### Copy

Can be used to copy fonts files from `/bower_components` to `/public` directory.

Files to copy must be defined in the Gulp tasks options:
```js
var options = {
  //...
  copy: {
    // src: dest,
    './bower_components/font-awesome/fonts/*':            './public/fonts/',
    './bower_components/bootstrap/dist/fonts/*':          './public/fonts'
  }
};
require('igo').dev.setDefaultGulpTasks(gulp, options);
```

### Livereload

Install the Livereload extension for your browser (e.g. [Chrome extension](https://chrome.google.com/webstore/detail/livereload/jnihajbhpnppcggbcgedagnkighmdlei))

Your browser will automatically reload the page when a file is modified.
