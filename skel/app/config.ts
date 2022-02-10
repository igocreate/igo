interface IConfig {
  cookieSecret: string;
  cookieSession: {
    keys: string[];
  };
}

module.exports.init = (config: IConfig) => {
  config.cookieSecret         = '{RANDOM_1}';
  config.cookieSession.keys   = [ '{RANDOM_2}' ];
};
