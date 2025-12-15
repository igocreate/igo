const SignalComponent = require('@igojs/signal/src/client/SignalComponent');

class UserMenu extends SignalComponent {
  constructor(element) {
    super(element, 'components/UserMenu');

    // initial state
    this.state.open = false;

    // events
    this.events = [
      { selector: '.menu-btn', eventType: 'click', handler: this.onToggle },
      { selector: 'document', eventType: 'click', handler: this.onClickOutside },
    ];
  }

  onToggle(e) {
    e.stopPropagation();
    this.state.open = !this.state.open;
  }

  onClickOutside(e) {
    if (!this.element.contains(e.target)) {
      this.state.open = false;
    }
  }
}

module.exports = UserMenu;
