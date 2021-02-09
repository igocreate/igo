
const fs    = require('fs');
const path  = require('path');

const async = require('async');

// https://web.dev/use-imagemin-to-compress-images/
const imagemin          = require('imagemin');
const imageminJpegtran  = require('imagemin-jpegtran'); // lossless
const imageminOptipng   = require('imagemin-optipng');  // lossless
const imageminGifsicle  = require('imagemin-gifsicle'); // lossless

const EXTENSIONS = [ '.jpg', '.jpeg', '.png', '.gif' ];
const ROOT = './public';

const RESOLVE_ROOT = path.resolve(ROOT);

let eco  = 0;

const s = (f) => {
  if (f > 1000000) {
    return (f/1000000).toFixed(2) + 'Mo';
  }
  return (f/1000).toFixed(2) + 'ko';
}

const imageminFile = (file, destination, callback) => {
  imagemin([file], {
    destination,
    plugins: [
      imageminJpegtran(),
      imageminOptipng(),
      imageminGifsicle()
    ]
  })
  .then(res => callback(null, res))
  .catch(err => {
    console.dir(err);
    callback(err)
  });
};


const walk = (dir, callback) => {
  // console.log('walk ' + dir);
  fs.readdir(dir, (err, files) => {
    async.eachSeries(files, (file, callback) => {
      const fullpath = path.resolve(dir, file);
      // console.log(file);
      
      fs.stat(fullpath, (err, stat) => {
        if (stat.isDirectory()) {
          // recursive
          return walk(fullpath, callback);
        }
        
        const ext = path.extname(file);
        if ([EXTENSIONS.indexOf(ext)] < 0) {
          return callback();
        }

        const ori_size = stat.size;
        // imagemin
        imageminFile(fullpath, dir, (err) => {
          callback(err);
          fs.stat(fullpath, (err, stat) => {
            if (ori_size > stat.size) {
              console.log(ROOT + fullpath.substr(RESOLVE_ROOT.length) + ': ' + s(ori_size) + ' > ' + s(stat.size));
              eco += ori_size - stat.size;
            }
          });
        });
      });
    }, callback);
  });
};


module.exports = () => {
  // let's walk
  walk(ROOT, () => {
    console.log('Done. Reduced ' + s(eco));
  });
}
