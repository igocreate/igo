
const fs      = require('fs');
const path    = require('path');

const sharp   = require('sharp');
const async   = require('async');
const config  = require('../src/config');

const EXTENSIONS = [ '.jpg', '.jpeg', '.png', '.gif', '.webp' ];
const ROOT = './public';

const RESOLVE_ROOT = path.resolve(ROOT);

let eco  = 0;

const s = (f) => {
  if (f > 1000000) {
    return (f/1000000).toFixed(2) + 'Mo';
  }
  return (f/1000).toFixed(2) + 'ko';
};

const compress = (file, destination, callback) => {
  // console.log('compressing ' + file);
  sharp(file)
  .png({ quality: 90 })
  .jpeg({ quality: 90 })
  .webp({ quality: 90 })
  .toFile(destination + '/tmp', (err) => {
    if (err) {
      return callback(err);
    }
    fs.rename(destination + '/tmp', file, callback);
  });
};

//
const walkthrough = (dir, callback) => {
  // console.log('walkthrough ' + dir);
  fs.readdir(dir, (err, files) => {
    async.eachSeries(files, (file, callback) => {
      const fullpath = path.resolve(dir, file);
      // console.log(file);
      
      // console.log(fullpath);
      fs.stat(fullpath, (err, stat) => {
        if (stat.isDirectory()) {
          // recursive
          return walkthrough(fullpath, callback);
        }
        
        const ext = path.extname(file);
        if (EXTENSIONS.indexOf(ext) < 0) {
          return callback();
        }

        const ori_size = stat.size;
        // compress
        compress(fullpath, dir, (err) => {
          if (err) {
            return callback(err);
          }
          fs.stat(fullpath, (err, stat) => {
            // console.log(ori_size + ' => ' + stat.size);
            if (ori_size > stat.size) {
              console.log(ROOT + fullpath.substr(RESOLVE_ROOT.length) + ': ' + s(ori_size) + ' > ' + s(stat.size));
              eco += ori_size - stat.size;
            }
            callback();
          });
        });
      });
    }, callback);
  });
};


module.exports = () => {
  // let's walkthrough
  walkthrough(ROOT, () => {
    if (config.env !== 'test') {
      console.log('Done. Reduced ' + s(eco));
    }
  });
};
