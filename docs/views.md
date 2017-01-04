
# Igo Views

Igo uses the [Dust](http://www.dustjs.com/) templating engine. This module is maintained by LinkedIn (https://github.com/linkedin/dustjs).

The templates files are located in the `/views` directory.

```js
// will render "/views/users/show.dust"
res.render('users/show');
```

## Template syntax

The Dust.js documentation can be found on http://www.dustjs.com/

## i18n

Igo uses [i18next](http://i18next.com/), which is a great module so make sure that your read their [documentation](http://i18next.com/docs).
Here is the default configuration:

```js
config.i18n = {
  whitelist:            [ 'en', 'fr' ],
  preload:              [ 'en', 'fr' ],
  fallbackLng:          'en',
  backend: {
    loadPath:           'locales/{{lng}}/{{ns}}.json',
  },
  detection: {
    order:              [ 'querystring', 'path', 'cookie' ],
    lookupPath:         'lang',
    lookupQuerystring:  'lang',
    lookupCookie:       'lang',
    caches:             [ 'cookie' ]
  },
};
```

**Usage:**
Use the `{@t key="mykey" /}` syntax to insert internationalized wordings.

Translations are defined in the `/locales/{LANG}/translation.json` files.

```json
{
  "mykey": "Hello World"
}
```


## View helpers

Igo allows to define custom Dust Helpers in the `/app/helpers.js` file.

```js
module.exports.init = function(dust) {

  // define your dust helpers here
  // (example taken from http://www.dustjs.com/docs/helper-api/)
  dust.helpers.period = function(chunk, context, bodies, params) {
    var location = params.location, body = bodies.block;
    if (location === 'start') {
      chunk.write('.');
      chunk.render(body, context);
    } else if (location === 'end') {
      chunk.render(body, context);
      chunk.write('.');
    } else {
      dust.log('WARN', 'missing parameter "location" in period helper');
    }
    return chunk;
  };

};
```
