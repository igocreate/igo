
# Forms

Igo.js provides structured form handling with schema-based validation and type conversion.

## Schema Definition

```js
const schema = {
  attributes: [
    { name: 'name',      type: 'text' },
    { name: 'email',     type: 'text' },
    { name: 'age',       type: 'int' },
    { name: 'price',     type: 'float' },
    { name: 'birthdate', type: 'date', format: 'DD/MM/YYYY' },
    { name: 'active',    type: 'boolean' },
    { name: 'tags',      type: 'array', item_type: 'text' },
  ]
};
```

### Attribute Types

| Type | Conversion | Notes |
|------|-----------|-------|
| `text` | String or `null` | Trimmed |
| `int` | `parseInt()` | Spaces removed (`'1 234'` → `1234`) |
| `float` | `parseFloat()` | Comma replaced by dot (`'12,5'` → `12.5`) |
| `number` | `Number()` | |
| `date` | `moment(value, format).toDate()` | Requires `format` option |
| `boolean` | `true` / `false` | Use `allownull: true` for nullable |
| `array` | Array | Use `item_type` for typed items |
| `custom` | `attr.convert(value)` | Custom converter function |

### Attribute Options

```js
{
  name: 'field',
  type: 'int',
  default: 0,           // Default value if null
  allownull: true,       // For booleans: allow null instead of false
  item_type: 'int',      // For arrays: type of items
  format: 'YYYY-MM-DD',  // For dates: moment format
  convert: (v) => v,     // For custom type: converter function
}
```

## Form Class

Create a form class with a `validate` method:

```js
const { Form } = require('@igojs/server');

class UserForm extends Form(schema) {
  validate(req) {
    req.checkBody('name', 'error.name.required').notEmpty();
    req.checkBody('email', 'error.email.invalid').isEmail();
    req.checkBody('age', 'error.age.invalid').isInt({ min: 0, max: 150 });
  }
}
```

## Usage in Controllers

```js
app.post('/users', (req, res) => {
  const form = new UserForm().submit(req);

  if (form.errors) {
    req.flash('form', form);
    return res.redirect('/users/new');
  }

  const values = form.getValues();
  await User.create(values);
  res.redirect('/users');
});
```

## Processing Steps

When `form.submit(req)` is called:

1. **Sanitize** — Trim whitespace, normalize numbers
2. **Validate** — Run your `validate(req)` method
3. **On error** — Store errors, revert to original string values
4. **Convert** — Convert strings to target types (int, date, boolean...)

## Validation Methods

Validation is built on [validator.js](https://github.com/validatorjs/validator.js):

```js
req.checkBody('field', 'error.key').notEmpty();
req.checkBody('field', 'error.key').isEmail();
req.checkBody('field', 'error.key').isInt({ min: 0 });
req.checkBody('field', 'error.key').isFloat();
req.checkBody('field', 'error.key').isLength({ min: 3, max: 50 });
req.checkBody('field', 'error.key').match(/^[A-Z]+$/);
req.checkBody('field', 'error.key').custom(async (value) => {
  return value !== 'forbidden';
});
```

Other available methods: `checkQuery()`, `checkParam()`, `addError()`, `hasError()`.

## Error Handling

```js
const errors = req.getValidationErrors();
// null if no errors, or: { fieldName: { msg: 'error.key' }, ... }

if (form.errors) {
  // form.errors has the same structure
  req.flash('form', form);
  return res.redirect('/form');
}
```
