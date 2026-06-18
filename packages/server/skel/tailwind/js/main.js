// css
require('../scss/main.scss');

// js
const { start, Transitions } = require('@igojs/component/client');

// Reusable transition presets — defined here (not in node_modules) so Tailwind's
// scanner keeps the utility classes. Use in markup via transition:preset="…".
Transitions.preset('dropdown', {
  enter:     'transition ease-out duration-100',
  enterFrom: 'opacity-0 scale-95',    enterTo:  'opacity-100 scale-100',
  leave:     'transition ease-in duration-75',
  leaveFrom: 'opacity-100 scale-100', leaveTo:  'opacity-0 scale-95',
});
Transitions.preset('pop', {
  enter:     'transition duration-200 ease-out',
  enterFrom: 'opacity-0 scale-50',    enterTo:  'opacity-100 scale-100',
});

start();
