const { htmlencode } = require('./serialize.js');

// Parent → child event bindings.
//
// In a parent template, `{@component "X" on:change="onPicked" /}` declares that
// the child's `this.emit('change', payload)` should call the parent's `onPicked`
// method (with `this` = parent). The Dust compiler rewrites `on:change` to the
// `data-on-change` attribute (see ComponentSplitter.rewriteOnEvents), so by the
// time the @component helper runs, the binding arrives as a `data-on-*` prop.
//
// We must NOT serialize these as component props: they are wiring, not data.
// Split them out and render them as `data-emit-*` attributes on the wrapper div.
// The child reads `data-emit-*` at mount to resolve which parent method to call.
// A distinct `data-emit-` namespace keeps them clear of the child's own DOM
// `data-on-*` handlers (which EventDelegator dispatches via delegation).

const ON_PREFIX   = 'data-on-';
const EMIT_PREFIX = 'data-emit-';

// Split caller params into real props and event-binding attributes.
// Returns { props, attrs } where `attrs` is an HTML attribute string
// (leading space included when non-empty) ready to inject into the wrapper tag.
const extractEventBindings = (callerProps) => {
  const props = {};
  let attrs   = '';

  for (const [key, value] of Object.entries(callerProps)) {
    if (key.startsWith(ON_PREFIX)) {
      const event = key.slice(ON_PREFIX.length);
      attrs += ` ${EMIT_PREFIX}${htmlencode(event)}="${htmlencode(String(value))}"`;
    } else {
      props[key] = value;
    }
  }

  return { props, attrs };
};

module.exports = { extractEventBindings, ON_PREFIX, EMIT_PREFIX };
