// css
require('../scss/main.scss');

// js
const signal = require('@igojs/signal/client');
const Counter = require('./components/Counter');
const UserMenu = require('./components/UserMenu');

signal.start({
  components: {
    'components/Counter': Counter,
    'components/UserMenu': UserMenu
  }
});
