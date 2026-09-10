
// Charge le .env sans rien initialiser d'autre.
//
// Un fichier chargé par `node --import` tourne avant l'application, ce qui est
// obligatoire pour OpenTelemetry : il instrumente en remplaçant les modules au
// moment du require, donc il doit précéder le chargement d'express ou de
// mysql2. Mais à cet instant igo n'a pas encore lu le .env — c'est sa
// configuration qui appelle dotenv — et toute variable qu'un tel fichier lit
// vaut undefined.
//
// Importer igo pour contourner ça ne marche pas : ça charge express et winston,
// soit précisément ce que l'instrumentation devait précéder.
//
// D'où ce point d'entrée : `import '@igojs/server/env'` en tête d'un fichier
// --import.
//
// dotenv ne remplace jamais une variable déjà définie, et deux appels sont sans
// effet supplémentaire : l'import est sans risque même si l'application charge
// ensuite la configuration d'igo normalement.

// Même règle que src/config.js : en production les variables viennent de
// l'environnement, pas d'un fichier.
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ quiet: true });
}
