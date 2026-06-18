/* global document, window */
const i18next = require('i18next');

// Fetch translations from the server, init i18next, expose globally.
module.exports = async () => {
  const lang = document.documentElement.lang || 'en';
  const resp = await fetch('/__component/translations');
  const translation = await resp.json();
  await i18next.init({
    lng:         lang,
    fallbackLng: 'en',
    resources:   { [lang]: { translation } },
    interpolation: { escapeValue: false },
    showSupportNotice: false  // silence i18next's Locize promo banner
  });
  window.i18next = i18next;
};
