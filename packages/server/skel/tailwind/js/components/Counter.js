const SignalComponent = require('@igo/signal/src/client/SignalComponent');

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
