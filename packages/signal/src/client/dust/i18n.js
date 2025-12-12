const i18next = require('i18next');

// Get language from <html lang="..."> attribute (set by server)
const lang = document.documentElement.lang || 'en';

// Initialize i18next with translations injected from the server
i18next.init({
  lng: lang,
  fallbackLng: 'en',
  resources: {
    [lang]: {
      translation: window.__signal_translations || {}
    }
  },
  interpolation: {
    escapeValue: false
  }
});

// Expose globally for use in components
window.i18next = i18next;

