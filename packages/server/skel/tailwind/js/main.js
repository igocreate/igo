// css
require('../scss/main.scss');

// js
const component = require('@igojs/component/client');
const Counter = require('./components/Counter');
const UserMenu = require('./components/UserMenu');

component.start({
  components: {
    'components/Counter': Counter,
    'components/UserMenu': UserMenu
  }
});
