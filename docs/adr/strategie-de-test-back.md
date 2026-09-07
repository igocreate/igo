# Stratégie de test back

**Statut** : accepté  
**Date** : 2026-08-24

## Context and Problem Statement

Contrairement au front, le back **a déjà une culture de test** : 162 fichiers de test sur ladom, couvrant les services (75), les contrôleurs (58), les modèles (5), les utilitaires (6) et les validators (1). L'outillage est solide — Mocha comme runner, `dev.agent` pour les requêtes HTTP simulées, `Factory.js` pour les données de test, et surtout **l'isolation par transaction rollbackée** fournie par `@igojs/db`, qui permet de tester contre la vraie base sans pollution entre tests.

Ce qui change avec le virage API : les contrôleurs dust faisaient `res.render()` — difficile à asserter. Les contrôleurs API font `res.json()` — trivial à tester. Une couche apparaît (les DTOs), la validation passe de Joi à Zod, et les greenfield pourraient tourner sur Vitest plutôt que Mocha.

La question n'est pas de reconstruire — c'est de **valider l'existant, combler les trous, et poser les conventions pour la couche API**.

## Considered Options

### Runner : garder Mocha ou migrer vers Vitest

**Mocha** — 162 fichiers de test tournent dessus, l'isolation par transaction est câblée sur ses hooks, l'équipe le connaît.

**Vitest** — cohérence avec le front, mode watch plus rapide, configuration partagée avec Vite. Mais migrer 162 fichiers sans valeur ajoutée immédiate, et adapter les hooks de transaction d'igo.

**Retenu : Mocha sur les projets existants, Vitest sur les greenfield.** Pas de migration forcée. `@igojs/server` fournira un `dev.vitest()` à côté de `dev.test()` pour les projets qui choisissent Vitest (même API de hooks, adaptation faible).

### Niveau de test : unitaire pur (tout mocké) ou intégration avec la base

**Tout mocker** (services mockés dans les tests de contrôleurs, base mockée dans les tests de services) — rapide, isolé, mais donne une fausse confiance : le mock passe, la vraie requête échoue.

**Intégration avec la vraie base, isolée par transaction** — teste le vrai SQL, les vraies contraintes, les vraies jointures. L'isolation par rollback donne la vitesse du mock sans son mensonge.

**Retenu : intégration avec la base par défaut.** L'isolation par transaction d'`@igojs/db` est l'atout principal de la stack de test — c'est ce qui rend les tests d'intégration aussi rapides que des unitaires. Les mocks ne se justifient que pour les dépendances externes (API tierces, SMTP, services cloud).

### Tests de DTOs et validation Zod : isolés ou via le contrôleur

**Tests isolés** du DTO (`serialize(folder)` renvoie les bons champs) et du schéma Zod (`schema.parse(badInput)` rejette).

**Via le contrôleur** — `agent.get('/api/dossiers/1')` vérifie le JSON retourné (couvre le DTO), `agent.post('/api/dossiers', { body: {} })` vérifie la 400 (couvre la validation).

**Retenu : via le contrôleur.** Un test d'intégration couvre le DTO et la validation par construction, sans test supplémentaire. Exception : un DTO avec de la logique (calculs, agrégations) mérite un test unitaire dédié.

## Decision Outcome

### Deux niveaux de test, pas trois

| Niveau | Ce qu'on teste | Comment | Quand |
|---|---|---|---|
| **Unitaire** | Logique pure — algorithmes, règles métier à branches multiples, calculs | Service ou util appelé directement, assertions sur le retour | Quand la logique branche |
| **Intégration** | Le câblage complet — route → contrôleur → DTO → service → base | `dev.agent` avec la vraie base, transaction rollbackée | **Tout contrôleur API** |

**Pas de niveau intermédiaire mocké.** Pas de test de contrôleur avec service mocké, pas de test de service avec base mockée. L'isolation par transaction fait le travail du mock, en testant le vrai code.

Les mocks ne servent que pour les **dépendances externes** : API tierces (eyoma, FranceConnect, Pennylane), SMTP, services cloud. Tout ce qui est interne (base, services, modèles) tourne en réel.

### Règle : qu'est-ce qui doit être testé

**Tout nouveau contrôleur dans `@api/` a un test d'intégration.** Le test fait une requête HTTP via `dev.agent`, vérifie le JSON retourné (forme, champs exposés, champs absents) et l'état en base après l'opération.

**Un test d'intégration de contrôleur API couvre au minimum :**
- Le cas nominal — requête valide, réponse attendue.
- Le cas d'erreur de validation — body invalide, 400 avec message structuré.
- Le cas d'accès refusé — pas de session ou mauvais rôle, 401/403.
- Le cas entité absente — id inexistant, 404.

**Les services sont testés unitairement quand ils contiennent du branchement** — conditions métier, calculs, règles d'éligibilité. Un service qui ne fait que `Folder.where(...).first()` est couvert par le test du contrôleur.

**Sur le code existant** : les 162 fichiers de test restent. La règle s'applique au code nouveau. Quand on modifie un service existant, on ajoute un test pour la modification.

### Ce que couvre un test d'intégration API — exemple

```js
describe('GET /api/dossiers/:id', () => {

  it('should return the serialized folder', async () => {
    const applicant = await Factory.createApplicant();
    const folder = await Factory.createFolder({ applicant_id: applicant.id, type: 'agp' });

    const res = await agent.get(`/api/dossiers/${folder.id}`, {
      session: { applicant_id: applicant.id }
    });

    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.id, folder.id);
    assert.strictEqual(body.type, 'agp');
    assert.strictEqual(body.legacy_id, undefined);    // champ interne non exposé
    assert.strictEqual(body.applicant_id, undefined); // clé technique non exposée
  });

  it('should return 404 for unknown folder', async () => {
    const res = await agent.get('/api/dossiers/999999', {
      session: { applicant_id: 1 }
    });
    assert.strictEqual(res.statusCode, 404);
  });
});
```

Le test vérifie à la fois le contenu retourné (le DTO fonctionne) et l'absence de champs internes (le DTO protège). Pas besoin de test de DTO séparé.

### Factories

Le `Factory.js` existant continue de servir. Pour les greenfield sur Vitest, le même pattern s'applique — des fonctions de création qui insèrent en base et retournent l'objet, dans la transaction du test.

### Quand les tests tournent

| Moment | Ce qui tourne | Bloque |
|---|---|---|
| En développement | Mocha (ou Vitest) en mode watch sur les fichiers modifiés | Non |
| Avant commit (hook) | Les tests touchés par le diff | Le commit |
| Sur PR (CI) | Suite complète + E2E Playwright sur les parcours critiques | Le merge |

### Évolution de `@igojs/server` pour le support Vitest

| Composant | Ce qui change | Effort |
|---|---|---|
| `dev.vitest()` | Adaptateur des hooks de transaction pour Vitest (`beforeEach`/`afterEach`, même API) | Faible |
| `dev.agent` | À vérifier — probablement rien, c'est du HTTP pur | Faible |
| Setup file | Un `vitest.setup.js` équivalent au `init.js` actuel | Faible |

L'isolation par transaction rollbackée est le vrai atout d'igo pour les tests. Elle doit fonctionner à l'identique sur Mocha et Vitest.

## Consequences

- Bon : **la stratégie valide l'existant** au lieu de le remettre en cause. Les 162 fichiers de test, les factories, l'isolation par transaction — tout reste.
- Bon : **les contrôleurs API sont plus faciles à tester que les contrôleurs dust** — du JSON à asserter au lieu du HTML à parser.
- Bon : **l'intégration avec la vraie base attrape les bugs que les mocks cachent** — contraintes SQL, jointures, colonnes renommées.
- Bon : **les tests de contrôleur couvrent le DTO et la validation** sans test séparé — moins de code de test, plus de couverture réelle.
- Neutre : **deux runners cohabitent** (Mocha sur l'existant, Vitest en greenfield). C'est un compromis pragmatique — la migration forcée aurait un coût sans valeur.
- Mauvais : **`@igojs/server` doit fournir `dev.vitest()`** avant le premier greenfield. Effort faible mais nécessaire.
- Mauvais : **l'absence de mocks rend les tests dépendants d'une base fonctionnelle.** En CI, il faut une base de test. C'est déjà le cas aujourd'hui — pas de régression.

## Confirmation

Comment on saura, dans douze mois, si la stratégie fonctionne :

- **Proportion de contrôleurs `@api/` avec un test d'intégration** — cible 100 % sur le code nouveau.
- **Nombre de bugs de production liés à la sérialisation** (champ manquant, champ interne fuité) — mesure directe de l'efficacité des tests de DTO via contrôleur.
- **Temps d'exécution de la suite de tests** — si elle dépasse 2-3 minutes, investiguer les tests les plus lents (requêtes non isolées, factories trop lourdes).
- **Nombre de tests qui cassent sans raison métier** (tests fragiles) — mesure de la qualité des tests, pas de la couverture.

## More Information

La couche `@api/` avec DTOs détermine ce qu'on teste et comment : le test d'intégration d'un contrôleur API couvre le DTO et la validation par construction. Les conventions d'architecture applicative (services comme point d'entrée, DTOs comme barrière, DDD-lite sans formalisme) sont documentées dans l'ADR organisation des sources back.
