# Organisation des sources back

**Statut** : proposé  
**Date** : 2026-08-24

## Context and Problem Statement

Le front passe en SPA React servie en assets statiques. Le back igo, qui rendait des pages HTML via dust, doit maintenant exposer des **API JSON**. La structure actuelle est organisée par type (`controllers/`, `models/`, `services/`) avec des sous-dossiers par espace (`beneficiaire/`, `agent/`, `partenaire/`). Elle fonctionne et l'équipe la connaît.

La question est double : **comment ajouter les API dans les projets existants** sans casser la structure, et **quelle structure adopter pour un greenfield** avec igo-next.

### Ce que igo impose

`@igojs/server` impose deux fichiers, découverts par chemin :

- `app/routes.js` — doit exporter `init(app)`, point de montage des routes.
- `app/config.js` — doit exporter `init(config)`, surcharge de la config igo.

C'est tout. Le framework ne connaît aucun autre chemin dans `app/`.

Les aliases `@controllers/`, `@services/` et consorts que portent ladom et certigo **ne viennent pas d'igo** : ce sont des `_moduleAliases` déclarés dans le `package.json` du projet et résolus par la dépendance `module-alias`. Ni le framework ni son squelette ne les fournissent — le squelette utilise des chemins relatifs. Un projet est libre de les adopter ou non.

### Ce que igo n'impose pas

- L'organisation **à l'intérieur** de chaque dossier — libre. Ladom organise les contrôleurs par espace, d'autres projets pourraient faire autrement.
- L'existence de `forms/`, `validators/`, `middleware/` — choix de projet.
- Le dispatch par hostname ou par préfixe — code applicatif, pas framework.
- La couche service — ladom l'a construite, igo ne la fournit pas.

### La structure actuelle

```
app/
  controllers/           ← par espace
    beneficiaire/
      DispositifsController.js    ← thin : service → res.locals → res.render()
      FoldersController.js
    agent/
    APIController.js              ← API externe (eyoma), auth par token
  models/                ← un fichier par table, schéma inline (colonnes, associations)
    blocks/
    identities/
    ref/
  services/              ← logique métier, par domaine
    folder/
    beneficiaire/
    eyoma/
  forms/                 ← formulaires HTML, par espace
  middleware/
  utils/
  validators/            ← Joi
  routes/                ← un fichier par espace + api.js
  routes.js              ← dispatch par hostname
```

**Ce qui est déjà bien posé** : les contrôleurs sont fins (service → render), la logique métier est dans les services, les tests existent (162 fichiers, factories, isolation par transaction). **Ce qui manque** : pas de couche DTO, pas de convention pour les routes API front, erreurs en HTML même sur les routes JSON, validation en Joi.

**Observation sur certigo** : le planner de certigo place déjà contrôleurs et services dans le même dossier, et ses domaines (planner, catalog, crm, elearning) ont des modèles relativement indépendants. C'est du feature-based de fait. Ladom est le cas plus difficile : agent/bénéficiaire/partenaire voient les mêmes données sous des angles différents — le découpage est par vue, pas par domaine.

## Considered Options

### Organisation : par type, par feature, ou hybride

**Par type** (structure actuelle) — `controllers/`, `models/`, `services/` au premier niveau.
- Bon : familier, les aliases igo sont câblés dessus, le code existant (30+ modèles sur ladom, 65 sur certigo) ne bouge pas.
- Mauvais : le code d'un domaine est dispersé dans trois dossiers. Ajouter un domaine API touche `controllers/`, `services/` et potentiellement `models/`.

**Par feature** — tout un domaine (routes, contrôleur, DTO, service, modèle) dans un seul dossier.
- Bon : cohésion maximale, un domaine est auto-contenu, supprimer un domaine est un `rm -rf`.
- Mauvais : les modèles ORM sont transversaux côté back — `Folder` (20+ associations sur ladom) est utilisé par les dossiers, les documents, l'éligibilité, les paiements. Le rattacher à une feature n'est pas naturel quand 10 services l'importent. Côté front un type est léger et importable ; côté back un modèle ORM est une classe avec des méthodes, des requêtes et des associations.
- Mauvais : incompatible avec les aliases existants sans tout recâbler.

**Hybride** — les routes API et DTOs sont par domaine, les modèles et services restent par type.
- Bon : ajoute la couche API sans toucher à ce qui fonctionne.
- Bon : sur les projets existants, un alias `@api/` s'ajoute à côté des aliases en place.
- Mauvais : deux logiques de rangement dans le même projet.

### Emplacement des DTOs

**Méthode sur le modèle** (`folder.toAPI()`) — simple, mais mélange la responsabilité ORM et sérialisation. Surtout, la sérialisation dépend du consommateur : un dossier vu par l'agent et par le bénéficiaire n'expose pas les mêmes champs. Un `toAPI()` unique ne couvre pas ce cas.

**Dossier `@dto/` séparé** — rangement par type, comme les modèles. Mais les DTOs n'ont de sens qu'avec leur contrôleur : les co-localiser facilite la lecture et la revue de code.

**À côté du contrôleur API** — le DTO vit dans le même dossier que le contrôleur qui l'utilise. Chaque espace ou domaine peut avoir sa propre sérialisation du même modèle.

### Routes API : dans les routes existantes ou alias `@api/` séparé

**Dans les routes existantes** — les routes JSON cohabitent dans le même fichier que les routes dust. Simple, mais mélange les middlewares (le layout dust ne doit pas s'appliquer aux routes JSON), et la migration vers l'API pure est invisible dans l'arborescence.

**Alias `@api/` séparé** — les contrôleurs API vivent dans `app/api/`, avec leur propre alias. La migration est visible : `@controllers/` rétrécit, `@api/` grandit.

## Decision Outcome

### Options retenues

- **Hybride** pour les refontes, **par feature** pour les greenfield.
- **DTOs à côté du contrôleur API.**
- **Alias `@api/` séparé** (refonte) / **`@features/` et `@shared/`** (greenfield).

### Trajectoire refonte (projet existant)

La structure existante reste. Un alias `@api/` s'ajoute pour les contrôleurs JSON. Les modèles, services, et contrôleurs dust restent en place.

```
app/
  api/                             ← NOUVEAU — alias @api/
    dossiers/
      dossiers.routes.js
      dossiers.controller.js
      dossiers.dto.js
    beneficiaires/
      beneficiaires.routes.js
      beneficiaires.controller.js
      beneficiaires.dto.js
  controllers/                     ← EXISTANT — rétrécit avec la migration
    beneficiaire/
    agent/
  models/                          ← INCHANGÉ
  services/                        ← INCHANGÉ
  middleware/
  utils/
  config.js
  routes.js
```

Les projets qui utilisent déjà `module-alias` ajoutent `@api` à côté de leurs aliases existants :

```json
"_moduleAliases": {
  "@api":         "app/api",
  "@controllers": "app/controllers",
  "@models":      "app/models",
  "@services":    "app/services",
  "@utils":       "app/utils",
  "@forms":       "app/forms",
  "@validators":  "app/validators"
}
```

### Trajectoire greenfield (igo-next)

Organisation par feature : chaque domaine regroupe son contrôleur, son DTO, son service et son modèle. Les éléments transversaux (User, tables de référence, email, notifications) vivent dans `shared/`.

```
app/
  features/
    dossiers/
      dossiers.routes.js
      dossiers.controller.js
      dossiers.dto.js
      dossiers.service.js
      Dossier.js
    documents/
      documents.routes.js
      documents.controller.js
      documents.dto.js
      documents.service.js
      Document.js
    inscriptions/
      ...
  shared/
    models/
    services/
    middleware/
    utils/
  config.js
  routes.js
```

**Pas d'alias dans le squelette greenfield.** Les fichiers d'une feature sont côte à côte (`require('./dossiers.service')`) : l'alias résout la dispersion de l'organisation *par type*, problème que le feature-based n'a pas. Un projet reste libre d'ajouter `module-alias` s'il y tient.

**Règle d'import entre features** : une feature peut importer un modèle ou un service d'une autre feature (`require('../dossiers/Dossier')`). Les features ne sont pas des silos étanches — l'organisation porte la propriété, pas l'isolation. Si un modèle est importé par la majorité des features, il migre dans `shared/models/`.

### Anatomie d'un domaine API

Qu'il vive dans `@api/` (refonte) ou `@features/` (greenfield), un domaine contient trois fichiers minimum :

**Routes** — déclaration des endpoints :

```js
const { express } = require('@igojs/server');
const controller  = require('./dossiers.controller');

const router = express.Router();

router.get('/',     controller.index);
router.get('/:id',  controller.show);
router.post('/',    controller.create);
router.put('/:id',  controller.update);

module.exports = router;
```

**Contrôleur** — thin, appelle le service et sérialise via le DTO :

```js
const FolderService = require('@services/FolderService');
const dto           = require('./dossiers.dto');

exports.index = async (req, res) => {
  const dossiers = await FolderService.findByApplicant(req.user.id);
  res.json(dossiers.map(dto.serialize));
};

exports.show = async (req, res) => {
  const dossier = await FolderService.findById(req.params.id);
  if (!dossier) return res.status(404).json({ error: 'Dossier non trouvé' });
  res.json(dto.serialize(dossier));
};

exports.create = async (req, res) => {
  const dossier = await FolderService.create(req.body);   // déjà validé et coercé
  res.status(201).json(dto.serialize(dossier));
};
exports.create.body = dto.CreerDossier;   // la validation s'applique d'elle-même
```

Le contrôleur **n'appelle jamais le parse** : un middleware d'`@igojs/server` valide en amont et remplace `req.body` par la valeur validée. Le schéma est attaché au handler — si le handler est monté, sa validation l'est. Voir [Stratégie de validation](strategie-de-validation.md).

**DTO** — sérialisation sortante + schémas entrants (Zod) :

```js
const { z } = require('zod');

exports.CreerDossier = z.object({
  type:           z.string(),
  beneficiary_id: z.number().int().positive(),
});

exports.Lister = z.object({
  page:   z.coerce.number().int().min(1).default(1),
  statut: z.enum(['brouillon', 'depose', 'valide']).optional(),
});

exports.serialize = (dossier) => ({
  id:         dossier.id,
  code:       dossier.code,
  type:       dossier.type,
  status:     dossier.status,
  createdAt:  dossier.created_at,
});
```

Le DTO est la barrière entre le modèle ORM et l'API, **dans les deux sens** — schémas en entrée, `serialize` en sortie. **Le front ne voit jamais un modèle ORM brut.** Si un domaine grossit, un sous-dossier `dto/` peut accueillir plusieurs sérialiseurs.

En TypeScript, ces schémas sont aussi la source des types : `z.infer<typeof CreerDossier>` évite de déclarer la forme deux fois.

### Montage des routes API

```js
const dossiersRoutes      = require('@api/dossiers/dossiers.routes');
const beneficiairesRoutes = require('@api/beneficiaires/beneficiaires.routes');

module.exports.init = (app) => {
  app.use('/api/dossiers',      apiMiddleware, dossiersRoutes);
  app.use('/api/beneficiaires', apiMiddleware, beneficiairesRoutes);

  app.all('/{*splat}', (req, res, next) => {
    // dispatch par hostname existant
  });
};
```

Le `apiMiddleware` vérifie l'authentification par session et garantit que les erreurs sont renvoyées en JSON.

### Amélioration de `@igojs/server` : error handler API

Le error handler actuel fait `res.status(500).render('errors/500')` — du HTML. **Sous le préfixe API, tout répond en JSON** : les 500, mais aussi les 404, les erreurs de validation et les `URIError`/`SyntaxError`. Un front React ne doit jamais recevoir une page d'erreur HTML, y compris sur une URL mal tapée.

Le préfixe est `/api` par défaut, surchargeable (`config.api.prefix`) — comme tous les défauts igo, il est là pour ne pas avoir à le configurer.

Le crash → mail reste actif, seule la réponse change de format.

### Format des erreurs : RFC 9457

Les erreurs API suivent **[RFC 9457 Problem Details](https://www.rfc-editor.org/rfc/rfc9457)**, avec le type de contenu `application/problem+json`. C'est un standard HTTP : les clients savent le lire, et il évite d'inventer un format maison qu'il faudrait documenter et faire vivre.

```json
{
  "type":   "about:blank",
  "title":  "Validation failed",
  "status": 400,
  "errors": [
    { "path": "beneficiary_id", "message": "Expected number, received string" }
  ]
}
```

`type`, `title` et `status` sont les champs standard ; `errors` est l'extension pour le détail de validation, que le front affiche champ par champ sans transformation.

### Validation avec Zod — middleware global

Le middleware est **monté par igo sur le préfixe API**, pas déclaré route par route. Le schéma est attaché au handler :

```js
exports.create.body  = dto.CreerDossier;
exports.index.query  = dto.Lister;
```

Le middleware valide, remplace la valeur par la sortie du schéma (coercitions et defaults compris), et répond 400 en Problem Details si le schéma rejette. Aucun appel à écrire dans les routes ni dans les contrôleurs.

Le middleware accepte **tout schéma [Standard Schema](https://standardschema.dev)** — zod, valibot ou arktype. `@igojs/server` dépend de zod pour le squelette, mais sa signature n'y est pas liée.

### Conventions d'architecture applicative — DDD-lite, pas de cérémonie

L'organisation existante (contrôleurs fins → services → modèles) recouvre les concepts utiles du DDD sans le formalisme :

| Concept DDD | Déjà en place | Formaliser ? |
|---|---|---|
| Use cases | Les méthodes de service (`FolderService.create()`) | Non — une classe `CreateFolderUseCase` n'ajouterait qu'une indirection |
| Aggregates | Les services contrôlent l'accès aux modèles | Non — le pattern est là, sans le nom |
| Repositories | Le modèle ORM (`Folder.where()`) | Non — une interface devant l'ORM est une abstraction sans consommateur |
| Anti-corruption layer | Les DTOs | Oui — c'est le seul apport formel de cette décision |

**Trois conventions à maintenir**, sans les encoder en abstractions :
- Les services restent le point d'entrée de la logique métier — pas de logique dans les contrôleurs.
- Un modèle structurant (Folder, Registration) passe par son service — pas de `Folder.create()` directement dans un contrôleur.
- Les DTOs sont la barrière API — le front ne voit jamais un modèle ORM brut.

## Consequences

- Bon : **la migration est visible** — `@controllers/` rétrécit, `@api/` grandit. Quand `@controllers/` est vide, dust est parti.
- Bon : **les services ne changent pas.** C'est la couche la plus volumineuse, et elle n'est pas touchée.
- Bon : **les DTOs empêchent la fuite de champs internes.** Plus de `res.locals.folder = folder` qui expose tout le schéma ORM au front.
- Bon : **le greenfield par feature donne la cohésion** que le back n'avait pas — certigo l'a déjà de fait dans le planner.
- Bon : **le error handler API dans `@igojs/server`** corrige un défaut réel — aujourd'hui une 500 sur une route JSON renvoie du HTML.
- Neutre : **deux structures à connaître** — hybride en refonte, feature en greenfield. L'anatomie d'un domaine API est la même dans les deux cas.
- Mauvais : **les DTOs sont du code à écrire et à maintenir.** Chaque champ ajouté au modèle doit être décidé : exposé ou non. C'est le prix de la barrière.
- Mauvais : **la frontière feature/shared en greenfield demande un jugement** — un modèle importé par trop de features devrait migrer dans `shared/`. Le seuil est subjectif.

## Confirmation

Comment on saura, dans six mois, si l'organisation fonctionne :

- **Proportion de routes API qui passent par un DTO** — si des contrôleurs font `res.json(model)` directement, la barrière est percée.
- **Taille de `@controllers/` vs `@api/`** — mesure de l'avancement de la migration.
- **Nombre de champs du modèle ORM exposés involontairement** — à vérifier en revue de code.
- **En greenfield : taille de `shared/models/` vs modèles dans les features** — si `shared/` grossit plus vite que les features, le découpage n'est pas le bon. Une analyse des 65 modèles de certigo montre un ratio d'environ 50/50 : les domaines à entités propres (elearning, tp, tt, vehicle) se prêtent bien au feature-based, mais le cœur métier (planner, crm) partage massivement. Pour un greenfield plus ciblé, le ratio sera probablement meilleur.

## More Information

Cette décision s'articule avec l'[organisation des sources front](organisation-des-sources-front.md) : les DTOs côté back définissent le contrat que les types TypeScript côté front dupliquent. Si les deux dérivent, la validation Zod côté front est le filet de détection.

L'amélioration du error handler et le middleware de validation Zod sont à implémenter dans `@igojs/server` — ils bénéficient à tous les projets.

La validation en Joi dans `@validators/` reste en place pour le code existant. Les nouvelles routes API utilisent Zod dans les DTOs. Les deux cohabitent.
