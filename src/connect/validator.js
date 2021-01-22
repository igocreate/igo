
const _         = require('lodash');
const validator = require('validator');
const { rejectSeries } = require('async');

class Chain {

  constructor(param, value, msg, errors) {
    this.param    = param;
    this.value    = value;
    this.msg      = msg;
    this.errors   = errors;
  }

  addError() {
    this.errors[this.param] = {
      param:  this.param,
      value:  this.value,
      msg:    this.msg,
    };
  }

  validate(key, inverse, ...args) {
    if (this.errors[this.param]) {
      // already an error on this param: skip
      return this;
    }
    const res = validator[key](String(this.value || ''), ...args);
    if (res === inverse) {
      this.addError();
    }
    return this;
  }

  custom(fn) {
    if (!fn(this.value)) {
      this.addError();
    }
    return this;
  }
}

// copy validatorjs functions
Object.keys(validator).forEach((key) => {
  if (typeof validator[key] !== 'function') {
    return;
  }
  Chain.prototype[key] = function(...args) {
    return this.validate(key, false, ...args);
  };
  if (key.startsWith('is')) {
    const inverseKey = `not${key.substr(2)}`;
    Chain.prototype[inverseKey] = function(...args) {
      return this.validate(key, true, ...args);
    };
  }
});


//
module.exports = (req, res, next) => {
  res.locals._errors = res.locals._errors || {};
  req.checkBody = (param, msg) => {
    return new Chain(param, req.body[param], msg, res.locals._errors);
  };
  req.checkParam = (param, msg) => {
    return new Chain(param, req.params[param], msg, res.locals._errors);
  };
  req.checkQuery = (param, msg) => {
    return new Chain(param, req.query[param], msg, res.locals._errors);
  };
  req.getValidationErrors = () => {
    return _.isEmpty(res.locals._errors) ? null : res.locals._errors;
  }
  req.getValidationResult = () => {
    console.log('warn: req.getValidationResult() is deprecated. Use req.getValidationErrors()');
    const result = {
      errors:   res.locals._errors,
      isEmpty:  () => _.isEmpty(res.locals._errors),
      mapped:   () => res.locals._errors,
      array:    () => _.values(res.locals._errors),
    };
    return new Promise((resolve) => {
      resolve(result);
    });
  };
  next();
};