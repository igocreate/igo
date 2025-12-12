
// css
import '../scss/main.scss';

// js
const signal = require('@igo/signal/src/client');
const Counter = require('./components/Counter');
const UserMenu = require('./components/UserMenu');

signal.start({
  components: {
    'components/Counter': Counter,
    'components/UserMenu': UserMenu
  }
});
