

class Config {

  constructor() {
    this.cache      = false;
    this.views      = './views';
    this.htmlencode = true;
    this.htmltrim   = true;
  }

  configure(settings) {

    if (settings.views !== undefined) {
      this.views = settings.views;
    }

    // Handle Express 'view cache' setting (cache takes priority)
    if (settings.cache !== undefined || settings['view cache'] !== undefined) {
      this.cache = !!(settings.cache ?? settings['view cache']);
    }

    ['htmlencode', 'htmltrim'].forEach((key) => {
      if (settings[key] !== undefined) {
        this[key] = !!settings[key];
      }
    });

  }

};

module.exports = new Config();