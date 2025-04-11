
const fs      = require('fs/promises');
const path    = require('path');

const sharp   = require('sharp');

// % size reduction threshold
const THRESHOLD   = 10;

const EXTENSIONS  = [ '.jpg', '.jpeg', '.png', '.gif', '.webp' ];
const ROOT = './public';
const TEMPFILE = '__igo_tmp';
const RESOLVE_ROOT = path.resolve(ROOT);

let eco  = 0;

const s = (f) => {
  if (f > 1000000) {
    return (f/1000000).toFixed(2) + 'Mo';
  }
  return (f/1000).toFixed(2) + 'ko';
};

const compress = async (file, destination, ori_size) => {
  // console.log('compressing ' + file);

  sharp(file)
  .png ({ force: false, quality: 95 })
  .jpeg({ force: false, quality: 95 })
  .webp({ force: false, quality: 95 })
  .toFile(  destination + '/' + TEMPFILE )

  const ratio = Math.max(0, 100 * (ori_size - info.size) / ori_size);
  if (ratio < THRESHOLD) {
    return await fs.rm(destination + '/' + TEMPFILE);
  }

  return await fs.rename(destination + '/' + TEMPFILE)
};

//
const walkthrough = async (dir) => {
  const files = await fs.readdir(dir);
  for (const file of files) {
    const fullpath = path.resolve(dir, file);
    
    const stat = await fs.stat(fullpath);
    if (stat.isDirectory()) {
      await walkthrough(fullpath);
      continue;
    }

    const ext = path.extname(file);
    if (EXTENSIONS.indexOf(ext) < 0) {
      continue;
    }

    const ori_size = stat.size;
    const compressed = await compress(fullpath, dir, ori_size);
    if (compressed) {
      const newStat = await fs.stat(fullpath);
      if (ori_size > newStat.size) {
        console.log(ROOT + fullpath.substr(RESOLVE_ROOT.length) + ': ' + s(ori_size) + ' > ' + s(stat.size));
        eco += ori_size - newStat.size;
      }
    }
  }
}


module.exports = async () => {
  // let's walkthrough
  await walkthrough(ROOT)
};
