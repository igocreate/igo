# Stratégie de validation

**Statut** : accepté  
**Date** : 2026-08-20

## Context and Problem Statement

Le passage à un échange JSON — décidé dans [Format d'échange front/back](format-echange-front-back.md) — rend inopérante la validation actuelle d'igo, qui est *orientée formulaire* : les erreurs sont exposées par formulaire sous `form.errors[name]` et rendues par le template. Hors de ce cadre, la seule pratique existante est la validation à la main par contrôleur (`FolderEventsValidator.js` dans ladom), qui ne passe pas l'échelle d'une API.

Il faut donc décider où valide-t-on, avec quel mécanisme, et si les règles sont partagées entre client et serveur.

## Considered Options

1. **Validation client + validation serveur au niveau API**, mécanisme dédié dans `@igojs/server`.
2. **Validation client uniquement**, l'API faisant confiance à son front.
3. **Validation serveur uniquement**, le client se contentant d'afficher les erreurs retournées.
4. **Contraintes déclarées sur le modèle de persistance** (`@igojs/db`), l'API validant contre le modèle de base.
5. **Schéma unique obligatoirement partagé** entre client et serveur.

## Decision Outcome

**Option 1 retenue : valider aux deux niveaux, avec des rôles distincts, via un middleware dans `@igojs/server`.**

- **Côté client, quand c'est possible** : validation de surface — format, obligatoire, longueur, cohérence entre champs — pour un retour immédiat sans aller-retour réseau. C'est un agrément d'usage.
- **Côté serveur, au niveau de l'API, systématiquement.** C'est une frontière de sécurité, jamais une redondance. Elle s'applique même lorsque l'API est privée et consommée uniquement par le front de l'agence.
- **La validation métier — non surfacique — reste côté serveur.** Le front doit savoir afficher un retour d'erreur serveur pour ces cas : c'est le fonctionnement normal, pas un mode dégradé.
- **Le middleware vit dans `@igojs/server`**, valide la requête contre un **schéma DTO déclaré indépendant du modèle de persistance**, et renvoie des **erreurs structurées** que le front affiche sans transformation. Rien n'est ajouté à `@igojs/db`.
- **Le format d'erreur est [RFC 9457 Problem Details](https://www.rfc-editor.org/rfc/rfc9457)** (`application/problem+json`), et non un format maison. Un standard HTTP se documente tout seul et se lit par n'importe quel client ; le détail par champ passe par l'extension `errors`.
- **Le middleware est global, pas déclaré route par route.** igo le monte sur le préfixe API ; le schéma est attaché au handler (`controller.create.body = dto.CreerDossier`). Rien à écrire dans les routes — l'équivalent JavaScript du `ValidationPipe` global de NestJS, dont les décorateurs `class-validator` supposent TypeScript et `emitDecoratorMetadata`.
- **La signature accepte tout schéma [Standard Schema](https://standardschema.dev)** — zod, valibot, arktype. Le squelette livre zod ; le framework n'est pas lié à ce choix.
- **Le typage TypeScript découle des mêmes schémas**, sans les redéclarer (`z.infer<typeof CreerDossier>`), via des `.d.ts` sur l'API publique. Les projets JavaScript ne voient aucune différence : les `.d.ts` ne sont jamais chargés à l'exécution.
- **Le partage des schémas est autorisé, jamais obligatoire.** Un schéma isomorphe (zod, déjà présent dans ladom pour les schémas d'extraction OCR) permet de déclarer une fois et d'utiliser des deux côtés — à retenir quand ça simplifie.

### Pourquoi les autres ont été écartées

- **Option 2** — une API non validée n'est pas une API de qualité ; elle ne peut pas dépendre de la bonne conduite de son client, même privé.
- **Option 3** — impose un aller-retour réseau pour tout retour de validation. Pénalisant sur les parcours mobiles en réseau dégradé, qui sont le cas d'usage dominant côté bénéficiaire.
- **Option 4** — coupler le contrat d'API au modèle de persistance interdit que le modèle exposé au client diffère du modèle de base, alors que cette séparation est la pratique recommandée en architecture hexagonale. Un DTO n'est pas un enregistrement.
- **Option 5** — dupliquer une règle de surface n'est pas un anti-pattern quand c'est justifié, et c'est parfois plus simple à maintenir qu'un partage. En faire une obligation ajouterait de la contrainte sans bénéfice garanti.

## Consequences

- Bon : `@igojs/server` porte déjà `FormHandler` — la validation d'API est **l'évolution d'une capacité existante** dans le paquet le plus mature, pas une brique nouvelle.
- Bon : un schéma DTO isomorphe ouvre trois bénéfices d'un seul geste — validation déclarée, inférence des types TypeScript pour le front, et dérivation d'un contrat OpenAPI.

- Neutre : **ce coût est indépendant de l'architecture front retenue** — il échoit dès que le serveur expose du JSON, et se chiffre une fois, non par écran. **Ce n'est donc un argument ni pour ni contre une architecture front.**

- Mauvais : c'est un coût de framework à payer avant de pouvoir exposer sérieusement du JSON.

## More Information

Cette décision découle de [Format d'échange front/back](format-echange-front-back.md) : sans le passage au JSON, la validation orientée formulaire d'igo resterait en place et il n'y aurait rien à trancher ici.

**État de l'art constaté** : ladom porte `zod ^4.3.6` (schémas d'extraction OCR), `joi ^18.0.2` et deux entrées dans `app/validators/`. certigo n'a ni l'un ni l'autre.

L'outillage de génération OpenAPI depuis un schéma zod repose sur des bibliothèques tierces dont l'état reste à vérifier — à instruire dans la recherche externe avant de s'y engager.
