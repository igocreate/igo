let _sharedForm = null;

class FormHandler {
  constructor(component, formData) {
    this.component  = component;
    this.element    = component.element;
    this._state     = component.rawState;
    this._bound     = false;

    // Initialize form state
    this._state.form = this.initForm(formData);
  }

  // Initialize form from props.form
  // Uses a module-level shared object so all components share the same form state
  initForm(formData) {
    if (!_sharedForm) {
      _sharedForm = { ...formData };
    }
    return _sharedForm;
  }

  static getSharedForm() {
    return _sharedForm;
  }

  // Delegated: two listeners on the root (attached once) cover every field,
  // including those added by later renders. Idempotent.
  bind() {
    if (this._bound) {
      return;
    }
    this._onInput  = (e) => this._delegate(e, 'input');
    this._onChange = (e) => this._delegate(e, 'change');
    this.element.addEventListener('input', this._onInput);
    this.element.addEventListener('change', this._onChange);
    this._bound = true;
  }

  unbind() {
    if (!this._bound) {
      return;
    }
    this.element.removeEventListener('input', this._onInput);
    this.element.removeEventListener('change', this._onChange);
    this._bound = false;
  }

  // Route a delegated event to handleInput when the field is a named form field
  // owned by this component (not a child) and the event type matches its kind.
  _delegate(e, phase) {
    const el = e.target;
    if (!el || !el.name || el.type === 'file') {
      return;
    }
    if (el.tagName !== 'INPUT' && el.tagName !== 'SELECT' && el.tagName !== 'TEXTAREA') {
      return;
    }
    // Skip fields belonging to a child component.
    const owner = el.closest('[data-component]');
    if (owner && owner !== this.element) {
      return;
    }
    const expected = (['checkbox', 'radio'].includes(el.type) || el.tagName === 'SELECT') ? 'change' : 'input';
    if (phase !== expected) {
      return;
    }
    this.handleInput(el);
  }

  // Handle form input change
  handleInput(element) {
    const { name, type, value } = element;

    // name[index][] format
    const arrayWithIndexMatch = name.match(/^(.+)\[(\d+)\]\[\]$/);
    if (arrayWithIndexMatch) {
      const [, fieldName, indexStr] = arrayWithIndexMatch;
      const index = parseInt(indexStr, 10);

      this._state.form[fieldName] = this._state.form[fieldName] || [];

      if (type === 'select-multiple') {
        this._state.form[fieldName][index] = [...element.options].filter(o => o.selected).map(o => o.value);
      } else if (type === 'checkbox') {
        this._state.form[fieldName][index] = Array.from(this.element.querySelectorAll(`[name="${name}"]:checked`)).map(el => el.value);
      } else {
        this._state.form[fieldName][index] = value;
      }
      return this.component._triggerRender();
    }

    const isArray = name.endsWith('[]');
    const fieldName = isArray ? name.slice(0, -2) : name;

    if (type === 'checkbox') {
      this._state.form[fieldName] = isArray
        ? Array.from(this.element.querySelectorAll(`[name="${name}"]:checked`)).map(el => el.value)
        : element.checked;
    } else if (type === 'select-multiple') {
      this._state.form[fieldName] = [...element.options].filter(o => o.selected).map(o => o.value);
    } else if (isArray) {
      this._state.form[fieldName] = this._state.form[fieldName] || [];
      const elements = Array.from(this.element.querySelectorAll(`[name="${name}"]`));
      const elementIndex = elements.indexOf(element);
      if (elementIndex !== -1) {
        this._state.form[fieldName][elementIndex] = value;
      }
    } else {
      this._state.form[fieldName] = value;
    }

    this.component._triggerRender();
  }
}

module.exports = FormHandler;
