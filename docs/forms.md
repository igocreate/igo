# Igo Forms

## Overview

Igo offers a structured approach for handling user inputs in Node.js applications using form schemas. This guide will walk you through the steps to create, validate, and manage forms with Igo.

## Table of Contents
- [Setting up the Schema](#setting-up-the-schema)
- [Creating the Form Class](#creating-the-form-class)
- [Using the Form in Routes](#using-the-form-in-routes)
- [Custom Validation](#custom-validation)
- [Error Handling](#error-handling)
- [Validation Library](#validation-library)

## Setting up the Schema

Every form in Igo begins with a schema definition. The schema outlines the attributes the form will accept and their respective types.

```javascript
const schema = {
  attributes: [
    { name: 'family_id', type: 'int' },
    { name: 'training_id', type: 'int' },
    ...
  ]
};
```

## Creating the Form Class

Once the schema is defined, create a form class extending Igo's base form model. This class will also include a validation method to set validation rules for each field.

```javascript
const { Form } = require('igo');

class TestForm extends Form(schema) {
  validate(req) {
    req.checkBody('family_id', 'error.products.family_id').notEmpty();
    ...
  }
}
```

## Using the Form in Routes

With the form class ready, you can use it within your Express routes to process form data.

```javascript
const TestForm = require('./path_to_your_form_class');

app.post('/submit', (req, res) => {
  const form = new TestForm().submit(req);

  if (form.errors) {
    req.flash('form', form);
    return res.redirect('/tt/tests/new');
  }

  // Continue processing valid data here
});
```

## Custom Validation

Igo allows for extensive customization in validation to cater to specific needs. Add unique conditions, checks, and other validation rules within the `validate` method of your form class.

## Error Handling

When Igo detects validation errors, it captures them for easy retrieval and user feedback. If there are validation errors, the `form.errors` property will be populated. 

```javascript
if (form.errors) {
  req.flash('form', form);
  return res.redirect('/error_page');
}
```

## Validation Library

Igo's validation mechanism is built upon its internal `validator.js` file, which is based on the [validator.js library](https://github.com/validatorjs/validator.js). This provides a robust set of validators and sanitizers for strings, ensuring that form data is both accurate and secure.
