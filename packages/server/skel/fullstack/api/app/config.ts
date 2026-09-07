import type { Config } from '@igojs/server';

export const init = (config: Config) => {
  config.cookieSecret = '{RANDOM_1}';
  config.cookieSession.keys = ['{RANDOM_2}'];
};
