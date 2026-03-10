class FormHandler {
  constructor(component, formData) {
    this.component = component;
    this.element = component.element;
    this._state = component.rawState;
    this._boundListeners = [];

    // Initialize form state
    this._state.form = this.initForm(formData);
  }

  // Initialize form from props.form
  // Uses a shared form object (window.__component_form) so all components share the same form state
  initForm(formData) {
    if (!window.__component_form) {
      window.__component_form = { ...formData };
    }
    return window.__component_form;
  }

  bind() {
    this.element.querySelectorAll('input, select, textarea').forEach(element => {
      if (!element.name) {
        return;
      }

      // Skip inputs that are inside child components
      const parentComponent = element.closest('[data-component]');
      if (parentComponent && parentComponent !== this.element) {
        return; // Skip this input, it belongs to a child component
      }

      const eventType = ['checkbox', 'radio'].includes(element.type) || element.tagName === 'SELECT' ? 'change' : 'input';
      const handler = (e) => this.handleInput(e.target);

      element.addEventListener(eventType, handler);
      this._boundListeners.push({ element, eventType, handler });
    });
  }

  unbind() {
    this._boundListeners.forEach(({ element, eventType, handler }) => {
      element?.removeEventListener(eventType, handler);
    });
    this._boundListeners = [];
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
