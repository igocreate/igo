const { SignalComponent } = require('@igojs/signal/client');

class Counter extends SignalComponent {
  constructor(element, props) {
    super(element, 'components/Counter', props);

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
