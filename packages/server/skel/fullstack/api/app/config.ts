import type { Config } from '@igojs/server';

export const init = (config: Config) => {
  config.cookieSecret = '{RANDOM_1}';
  config.cookieSession.keys = ['{RANDOM_2}'];

  // Une ligne par requête est le premier poste d'un volume de logs, et les
  // requêtes qui réussissent n'apprennent rien que les métriques ne portent
  // déjà : latence par route et taux d'erreur se dérivent des spans.
  //
  // À décommenter quand l'observabilité est branchée — pas avant, sinon on perd
  // les seules traces d'activité dont on dispose.
  // config.logrequests = 400;
};
