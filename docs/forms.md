
# Igo Form

Igo Form is a module of igo named *Form*. You must create a class that extends the *Form* module, and that class will then help you to validate, sanitize and convert your form.

The implementation of an Igo form is made in 4 steps:
- [Declare the *Form* class](#declare-the-form-class)
- [Use the form class with a controller](#use-the-form-class-with-a-controller)
- [Display the form in a view](#display-the-form-in-a-view)
- [Submit the form and validate it](#submit-the-form-and-validate-it)


## Declare the *Form* class

To manage your form class, you must create a file for your class. The first step is then to import the module *Form* from igo in the file.
```
const { Form } = require('igo');
```

### Schema
Then you must create the schema that the form will be following. The schema is composed of several attributes, and each attribute must have a `name` and a `type`.\
The type is important as it allows the sanitization (e.g. replace `,` with `.` for a `float` element) and convertion (e.g. convert an `int` in base 10).
```
const schema = {
  attributes: [
    { name: 'company',  type: 'text' },
    // [...]
  ]
};
``` 

The following types are available:
- `text`
- `int`
- `float`
- `date`
- `boolean`
- `array`

### Type Array

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


### Class declaration
Once the schema is created, it can be used in a class.

```
class ContactForm extends Form(schema) {

  init(query) {
    this.company = query.company;
    return this;
  }

  validate(req) {
    req.checkBody('company',   'errors.contact.company').notEmpty();
  }
}

module.exports = ContactForm;
```

The `init` function is needed to match the object of the form with the schema.\
The `validate` function works using [Validator.js](https://github.com/validatorjs/validator.js), and validates that the elements of the form are correct.

## Use the form class with a controller

The form object can now be used to validate a form. To use it in a controller, import the class and instantiate it using the values of the form (in the example below, those values are in `req.query`). If the values are empty, the form will initialize itself with empty values.
```

module.exports.contact = (req, res) => {
  const form = res.locals.flash.form || new ContactForm().init(req.query);
  res.render('welcome/contact', { form });
};
```

## Display the form in a view

If you use a template engine (as [igo-dust](https://github.com/igocreate/igo-dust)), the form and the errors that the validation will generate will be saved in the form object. To render the form, simply call the attribute of the form that you want to access and render.
```
 <div class="form-group">
    <input type="text" name="company" value="{form.company}">
    <div class="invalid-feedback">{#t key=form.errors.company.msg /}</div>
  </div>
```

## Submit the form and validate it

To validate the form, you must call the function `submit` on it. This function will match the function `validate` from your class with the form.

If the validation generates errors, those errors are then in `form.errors`. If there is none error, `form.errors` will be `null`.
```
module.exports.submitContact = (req, res) => {
  const form = new ContactForm().submit(req);
  if (form.errors) {
    req.flash('form', form);
    return res.redirect('/contact');
  }
  // [...]
});
```
If you want to access values from the form, they are inside the form object (e.g. the value for the input named `company` is in `form.company`).
