
module.exports.init = (config) => {
  config.cookieSecret         = '{RANDOM_1}';
  config.cookieSession.keys   = [ '{RANDOM_2}' ];
};
