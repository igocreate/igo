
# Igo Views

Igo.js uses the [Igo Dust.js](https://github.com/igocreate/igo-dust) templating engine.

The templates files are located in the `/views` directory.

```js
// will render "/views/users/show.dust"
res.render('users/show');
```

## Template syntax

The Igo Dust.js documentation can be found [here](https://igocreate.github.io/igo-dust/).

## i18n

Igo.js uses [i18next](http://i18next.com/), which is a great module so make sure that your read their [documentation](http://i18next.com/docs).
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

Igo.js allows to define custom Dust Helpers in the `/app/helpers.js` file.

```js
module.exports.init = function(dust) {

  // define your dust helpers here
  // (example taken from https://igocreate.github.io/igo-dust/#/guide/helpers?id=custom-helpers)
  // @nl2br helper
  igodust.helpers.nl2br = (params, locals) => {
    if (params.value) {
      return params.value.replace(/(\r\n|\n\r|\r|\n)/g, '<br/>');
    };
  };

  // @boolean helper
  igodust.helpers.boolean = (params, locals) => {
    const color = params.value ? 'success' : 'danger';
    return `<div class="bullet bullet-sm bullet-${color}"></div>`;
  };

};
```

Igo.js have one predefined helper :

  Dateformat, it take a timestamp and format it with the help of momentjs [momentjs](https://momentjs.com/)
  
```js  
  {@dateformat date=date format="calendar" /}
```