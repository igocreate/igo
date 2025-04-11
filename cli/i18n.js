
const https       = require('https');
const fs          = require('fs/promises');
const _           = require('lodash');
const csvWriter   = require('csv-write-stream');

const config      = require('../src/config');

const readJson = async(path) => {
  const data = await fs.readFile(path)
  return JSON.parse(data);
};

//
const parseJson = (json) => {
  const rows = json.table.rows;
  const translations = {};

  // get indexes (key and langs)
  const firstRow = rows.shift();
  const indexes = {};
  _.each(firstRow.c, (v, i) => {
    if (v && v.v) {
      indexes[v.v] = i;
    }
  });

  // parse
  rows.forEach(entry => {
    const key = _.get(entry, `c[${indexes.key}].v`);
    if (!key) {
      return ;
    }
    config.i18n.whitelist.forEach((lang) => {
      const value = _.get(entry, `c[${indexes[lang]}].v`);
      _.setWith(translations, `${lang}.${key}`, value, Object);
    });
  });
  return translations;
};

const writeTranslationFiles = async (translations) => {
  // write translation files
  for (const lang of config.i18n.whitelist) {
    const dir = `./locales/${lang}`;
    const exists = await fs.exists(dir);
    if (!exists) {
      console.warn('Missing directory: ' + dir);
      return;
    }
    translations[lang]._meta = {
      lang
    };
    const data = JSON.stringify(translations[lang], null, 2);
    const filename = `${dir}/translation.json`;
    console.log(`Writing ${filename}`);
    await fs.writeFile(filename, data);
  }
};


// verbs
const verbs   = {

  // igo i18n update
  update: async function(args) {
    if (!config.i18n.spreadsheet_id) {
      return console.error('Missing config.i18n.spreadsheet_id');
    }

    const url = `https://docs.google.com/spreadsheets/d/${config.i18n.spreadsheet_id}/gviz/tq?tqx=out:json`;
    console.log(`Loading: ${url}`);

    // request json data
    https.get(url, (resp) => {
      let body = [];

      resp.on('data', (chunk) => {
        body.push(chunk);
      });

      resp.on('end', async () => {
        const buffer = Buffer.concat(body);
        const text = buffer.toString();
        const json = JSON.parse(text.substr(47).slice(0, -2));
        const translations = parseJson(json);
        await writeTranslationFiles(translations);
      });
    })
  },

  // igo i18n csv
  csv: async function(args) {

    const langs = config.i18n.whitelist;
    const translations = [];

    for (const lang of langs) {
      translations.push(await readJson(`./locales/${lang}/translation.json`));
    }

    const keys    = [];
      
    // build keys
    const traverse = (obj, parents) => {
      for (const key in obj) {
        const val = obj[key];
        if (_.isObject(val)) {
          traverse(obj[key], parents.concat([key]));
        } else if (_.isString(val)) {
          keys.push(parents.concat([key]).join('.'));
        }
      }
    };

    translations.forEach(translation => {
      traverse(translation, []);
    });

    // build csv  
    const writer = csvWriter({ headers: ['key'].concat(langs) });
    const file = './translations.csv';
    writer.pipe(fs.createWriteStream(file));

    _.uniq(keys).forEach(key => {
      const row = _.map(translations, translation => _.get(translation, key));
      writer.write([key].concat(row));
    });

    writer.end();
    console.log(`${keys.length} lines written in ${file}`);
  }
};

// igo i18n
module.exports = function(argv) {
  var args = argv._;
  config.init();

  if (args.length > 1 && verbs[args[1]]) {
    verbs[args[1]](args)
    // process.exit(0);
  } else {
    console.error('ERROR: Wrong options');
    console.error('Usage: igo i18n [update|csv]');
  }
};
