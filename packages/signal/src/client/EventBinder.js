/**
 * EventBinder - Optimized event listener management with WeakMap caching
 *
 * Similar to how modern frameworks (Vue, Svelte, Solid) optimize event binding,
 * this class avoids unnecessary rebinding by caching listeners and reusing them
 * when DOM elements are preserved by DiffDOM.
 *
 * Strategy: WeakMap<Element, Map<eventType, handler>>
 * - Outer WeakMap: Element → Map of events (automatic garbage collection)
 * - Inner Map: eventType → handler (supports multiple events per element)
 *
 * Performance:
 * - O(1) lookup to check if listener exists
 * - No rebinding if element is preserved by DiffDOM
 * - Automatic cleanup when elements are removed (WeakMap GC)
 */
class EventBinder {
  constructor() {
    // WeakMap<Element, Map<eventType, handler>>
    this._elementListeners = new WeakMap();
    this._boundListeners = [];
  }

  /**
   * Bind events to elements with optimization
   *
   * @param {HTMLElement} rootElement - Root element to search within
   * @param {Array} events - Array of {selector, eventType, handler}
   * @param {Object} context - Context to bind handlers to (usually the component)
   */
  bind(rootElement, events, context) {
    if (!events || !Array.isArray(events)) return;

    const newListeners = [];
    const processedElements = new Map(); // Map<Element, Set<eventType>>

    events.forEach(({ selector, eventType, handler }) => {
      // Support 'document'/'window' strings as selector for global events
      let elements;
      if (selector === 'document') {
        elements = [document];
      } else if (selector === 'window') {
        elements = [window];
      } else {
        elements = rootElement.querySelectorAll(selector);
      }

      elements.forEach(targetElement => {
        // Skip warning for global selectors (document/window)
        const isGlobalSelector = targetElement === document || targetElement === window;

        // Warn if trying to bind to an element inside a child component
        // Only warn if targeting elements INSIDE a child component, not the component's root element itself
        if (!isGlobalSelector) {
          const closestComponent = targetElement.closest('[data-component]');
          const isTargetingChildComponentRoot = closestComponent === targetElement;
          if (closestComponent && closestComponent !== rootElement && !isTargetingChildComponentRoot) {
            console.warn(
              `[EventBinder] Warning: Attempting to bind ${eventType} event to selector "${selector}" ` +
              `which is inside a child component (${closestComponent.dataset.component}). ` +
              `Consider listening to a custom event from the child component instead.`,
              { parentComponent: context.constructor?.name, childComponent: closestComponent.dataset.component, targetElement }
            );
          }
        }

        // Get or create event map for this element
        let eventMap = this._elementListeners.get(targetElement);
        if (!eventMap) {
          eventMap = new Map();
          this._elementListeners.set(targetElement, eventMap);
        }

        // Check if this (element, eventType) already has a listener
        const existingHandler = eventMap.get(eventType);

        if (existingHandler) {
          newListeners.push({
            element: targetElement,
            eventType,
            handler: existingHandler
          });
        } else {
          const boundHandler = handler.bind(context);
          targetElement.addEventListener(eventType, boundHandler);
          eventMap.set(eventType, boundHandler);
          newListeners.push({
            element: targetElement,
            eventType,
            handler: boundHandler
          });
        }

        // Track processed elements for cleanup
        if (!processedElements.has(targetElement)) {
          processedElements.set(targetElement, new Set());
        }
        processedElements.get(targetElement).add(eventType);
      });
    });

    // Cleanup: Remove listeners for elements that were removed or changed
    this._boundListeners.forEach(({ element, eventType, handler }) => {
      const processedEvents = processedElements.get(element);
      if (!processedEvents || !processedEvents.has(eventType)) {
        element?.removeEventListener(eventType, handler);
        const eventMap = this._elementListeners.get(element);
        if (eventMap) {
          eventMap.delete(eventType);
          if (eventMap.size === 0) {
            this._elementListeners.delete(element);
          }
        }
      }
    });

    this._boundListeners = newListeners;
  }

  /**
   * Unbind all listeners and clear cache
   */
  unbind() {
    this._boundListeners.forEach(({ element, eventType, handler }) => {
      element?.removeEventListener(eventType, handler);
    });
    this._boundListeners = [];
  }
}

module.exports = EventBinder;
