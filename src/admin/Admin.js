
'use strict';

const _       = require('lodash');
const express = require('express');

const Index   = require('./Index');
const Show    = require('./Show');
const New     = require('./New');
const Create  = require('./Create');
const Edit    = require('./Edit');
const Update  = require('./Update');


const HtmlRenderer    = require('./HtmlRenderer');


//
const pluralize = function(name) {
  if (name.endsWith('y')) {
    return name.substring(0, name.length - 1) + 'ies';
  }
  if (name.endsWith('x')) {
    return name + 'es';
  }
  return name + 's';
};

module.exports = class Admin {

  static register(router) {

    const model   = this.model();
    const options = this.options();

    // default configuration
    const defaults = {
      fields:     model.schema.columns,
      adminpath:  '/admin',
      template:   'admin/admin',
      Name:       model.name,
      Plural:     pluralize(model.name),
      plural:     pluralize(model.name.toLowerCase()),
      name:       model.name.toLowerCase(),
      index:      {},
      show:       {},
      new:        {},
      edit:       {}
    };

    _.defaultsDeep(options, defaults);

    // index
    router.get ('/' + options.plural, Index(model, options));

    // new, create
    router.get ('/' + options.plural + '/new',  New(model, options));
    router.post('/' + options.plural,           Create(model, options));

    // show
    router.get ('/' + options.plural + '/:id', Show(model, options));

    // edit, update
    router.get ('/' + options.plural + '/:id/edit', Edit(model, options));
    router.post('/' + options.plural + '/:id',      Update(model, options));

  }

}
