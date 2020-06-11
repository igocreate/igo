
const request     = require('request');
const fs          = require('fs');
const _           = require('lodash');
const async       = require('async');
const csvWriter   = require('csv-write-stream');

const config      = require('../src/config');

const readJson = (path, callback) => {
  fs.readFile(path, (err, data) => {
    callback(err, JSON.parse(data)); 
  });
};

// verbs
const verbs   = {

  // igo i18n update
  update: function(args, callback) {
    if (!config.i18n.spreadsheet_id) {
      return callback('Missing config.i18n.spreadsheet_id');
    }
    const path = 'https://spreadsheets.google.com/feeds/list/' +
                  config.i18n.spreadsheet_id +
                  '/default/public/values?alt=json';

    // request json data
    request(path, (err, res, body) => {
      if (err) {
        return callback(err);
      }
      const json = JSON.parse(body);
      //console.dir(json);
      const translations = {};

      // parse
      json.feed.entry.forEach(entry => {
        //
        const key = _.get(entry, 'gsx$key.$t');
        config.i18n.whitelist.forEach((lang) => {
          const value = _.get(entry, 'gsx$' + lang + '.$t');
          if (value) {
            _.setWith(translations, lang + '.' + key, value, Object);
          }
        });

      });

      // write translation files
      config.i18n.whitelist.forEach((lang) => {
        const dir = `./locales/${lang}`;
        if (!fs.existsSync(dir)) {
          console.warn('Missing directory: ' + dir);
          return;
        }
        translations[lang]._meta = {
          generated_at: new Date(),
          lang
        };
        const data = JSON.stringify(translations[lang], null, 2);
        const filename = `${dir}/translation.json`;
        console.log('Writing ' + filename);
        fs.writeFileSync(filename, data );
      });

      callback();
    });
  },

  // igo i18n csv
  csv: function(args, callback) {
    const langs = config.i18n.whitelist;
    async.mapSeries(langs, (lang, callback) => {
      readJson(`./locales/${lang}/translation.json`, callback);
    }, (err, translations) => {
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
      traverse(translations[0], []);

      // build csv
      const writer = csvWriter({ headers: [ 'key' ].concat(langs) });

      writer.pipe(fs.createWriteStream('./translations.csv'))
      keys.forEach(key => {
        const row =  _.map(translations, translation => _.get(translation, key))
        writer.write([ key ].concat(row))
      });
      
      writer.end()
      console.log(keys.length + ' lines written');
      callback();
    });
  }

};

// igo i18n
module.exports = function(argv) {
  var args = argv._;
  config.init();

  if (args.length > 1 && verbs[args[1]]) {
    verbs[args[1]](args, function(err) {
      console.log(err || 'Done.');
      // process.exit(0);
    });
  } else {
    console.error('ERROR: Wrong options');
    console.error('Usage: igo i18n [update|csv]')
  }


};
