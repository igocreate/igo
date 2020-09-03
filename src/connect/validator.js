
const _         = require('lodash');
const validator = require('validator');

class Chain {

  constructor(param, value, msg, errors) {
    this.param    = param;
    this.value    = value;
    this.msg      = msg;
    this.errors   = errors;
  }

  validate(key, inverse, ...args) {
    if (this.errors[this.param]) {
      // already an error on this param: skip
      return this;
    }
    const res = validator[key](this.value || '', ...args);
    if (res === inverse) {
      this.errors[this.param] = {
        param:  this.param,
        value:  this.value,
        msg:    this.msg,
      };
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
  }
  if (key.startsWith('is')) {
    const inverseKey = `not${key.substr(2)}`;
    Chain.prototype[inverseKey] = function(...args) {
      return this.validate(key, true, ...args);
    }
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
  next();
};