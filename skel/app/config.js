

module.exports.init = (config) => {

  config.signedCookiesSecret = 'abcdefghijklmnopqrstuvwxyz';
  config.cookieSessionConfig = {
    name:   'app',
    keys:   [ 'aaaaaaaaaaa' ],
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  };

};
