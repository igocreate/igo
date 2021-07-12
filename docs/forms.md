
# Igo Form

Igo Forms will allow you to manage forms more easily by sanitizing, validating and converting user input.


- [How to use Igo Form](#how-to-use-igo-form)
- [Available datatypes](#available-datatypes)
- [Validation functions](#validation-functions)

## How to use Igo Form

### A basic Igo Form

Here is a simple IgoForm, where a schema and a Form class are declared.

The schema is composed of several attributes, and each attribute must have a name and a type.
The type is important as it allows the sanitization (e.g. replace , with . for a float element) and convertion (e.g. convert an int in base 10).

In the following example, a FriendForm is created, where the name of the user must be present.

```
const { Form }  = require('igo');

const schema = {
  attributes: [
    { name: 'name', type: 'text' }
  ]
};

class FriendForm extends Form(schema) {

  init(query) {
    this.name = query.name;
    return this;
  }

  validate(req) {
    req.checkBody('name',   'errors.user.name').notEmpty();
  }
}

module.exports = FriendForm;
```

### Use it in your controller

The form object can now be used to validate a form. To use it in a controller, import the class and instantiate it using the values of the form (in the example below, those values are in `req.query`). If the values are empty, the form will initialize itself with empty values.

```
// Import the form class
const FriendForm = require('./FriendForm');

module.exports.newFriend = (req, res) => {
  const form = res.locals.flash.form || new FriendForm().init(req.query);

  res.render('/newFriend', { form });
};
```

To validate the form, you must call the function `submit` on it. This function will match the function `validate` from your class with the form.

If the validation generates errors, those errors are then in `form.errors`. If there is none error, `form.errors` will be `null`.
```
module.exports.createFriend = (req, res) => {
  const form = new FriendForm().submit(req);
  if (form.errors) {
    req.flash('form', form);
    return res.redirect('/newFriend');
  }
  
  Friend.create(form, (err, friend) => {
    res.redirect('/friends');
  });
});
```
If you want to access values from the form, they are inside the form object (e.g. the value for the input named `name` is in `form.name`).

If you want to only get access to the values declared on the form, the function `getValues` on a form object will only return the values declared in the form. 

#### Options

In addition to submit, others functions can be called on an Igo Form.

• ```submit```: Sanitize the form, validate it (e.g. using [validator.js](https://github.com/validatorjs/validator.js)), save errors of the form, and convert the values (e.g. an input taking a number to an int). 

• ```sanitize```: Sanitize the form submitted. By default called with the function submit.

• ```revert```: revert to the values in req form.


•```convert```: convert the values of the form. 

•```getValues```: get the values on the form using the schema defined before.

### Use it in your template

If you use a template engine (as [igo-dust](https://github.com/igocreate/igo-dust)), the form and the errors that the validation will generate will be saved in the form object. To render the form, simply call the attribute of the form that you want to access and render.
```
 <div class="form-group">
    <input type="text" name="name" value="{form.name}">
    <div class="invalid-feedback">{#t key=form.errors.name.msg /}</div>
  </div>
```

## Available datatypes

The following types are available:
- `text`
- `int`
- `float`
- `date`
- `boolean`
- `array`

#### Specific datatypes:
##### • _array_

Igo Form allows to easily manipulate arrays in forms, by declaring them in the schema as attributes with the type `array`. 
```
const schema = {
  attributes: [
    { name: 'array_int',      type: 'array', item_type: 'int' },
    { name: 'array_default',  type: 'array', default: [] },
  ]
};
```
Two specific fields are available for arrays:
- `item_type` corresponds to the type of items inside an array. Those types are the same than the standard types (`text`, `int`, `date`, `float` or `boolean`).
- `default` indicates which value will be set if the value for that parameter is either `undefined` or `null`.

##### • _date_
Igo Form also allows to easily manipulate date, by declaring them in the schema as attributes with the type `date`.

```
const schema = {
  attributes: [
    { name: 'created_at',   type: 'date', format: 'DD/MM/YYYY' },
  ]
};
```

## Validation functions

The `validate` function works using [Validator.js](https://github.com/validatorjs/validator.js), and validates that the elements of the form are correct. 
