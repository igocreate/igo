const { SignalComponent } = require('@igojs/signal');

class Counter extends SignalComponent {
  constructor(element) {
    super(element, 'components/Counter');

    // initial state
    this.state.count = this.props.count || 0;

    // events
    this.events = [
      { selector: '.increment-btn', eventType: 'click', handler: this.onIncrement }
    ];
  }

  onIncrement() {
    this.state.count++;
  }
}

module.exports = Counter;
