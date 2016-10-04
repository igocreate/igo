

module.exports.init = function(config) {

  // modify secret keys
  config.signedCookiesSecret = 'abcdefghijklmnopqrstuvwxyz';
  config.cookieSessionConfig = {
    name: 'app',
    keys: [
      'aaaaaaaaaaa',
      'bbbbbbbbbbb',
      'ccccccccccc'
    ]
  };

};
