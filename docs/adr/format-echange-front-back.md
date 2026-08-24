# Format d'échange front/back

**Statut** : accepté  
**Date** : 2026-08-20

## Context and Problem Statement

Aujourd'hui le front des applications igo échange avec le serveur par **soumission de formulaires** et réception de **HTML rendu**. Là où de l'Ajax a été écrit à la main, le serveur renvoie encore un fragment HTML injecté dans la page — par exemple `document-upload.js` dans ladom :

```js
success: function(html) { upload.find('.upload-content').html(html); window.refreshAll(); }
```

Ce modèle a deux défauts constatés. **Les plugins ne sont pas rebranchés** après injection, ce qui décourage de faire de l'Ajax et pousse à recharger la page entière. Et **la zone remplacée est plus étroite que la zone à mettre à jour** : c'est la cause racine du bouton « Transmettre » qui n'apparaît pas après un dépôt de pièce — sa visibilité dépend de la liste des documents, mais il vit en dehors du fragment renvoyé. Le défaut a été remonté du terrain et n'a reçu qu'un contournement partiel.

Un front à modèle de composants a besoin de **données**, pas de balisage : il rend lui-même.

## Considered Options

1. **JSON** — le serveur expose des routes `/api` renvoyant des données ; le front rend.
2. **Conserver les fragments HTML rendus par le serveur** et les injecter côté client.
3. **Modèle mixte** — HTML pour les zones existantes, JSON pour les écrans nouveaux.

## Decision Outcome

**Option 1 retenue : le serveur expose du JSON.**

- Les nouveaux échanges passent par des **routes `/api` renvoyant des données**, non du balisage.
- Les erreurs de validation sont renvoyées **structurées**, dans un format stable que le front affiche sans transformation.
- **Conséquence assumée** : l'actif « forms + validation » d'igo devient hors sujet sur les écrans concernés. Ce n'est pas une perte à compenser, c'est un changement de couche.
- **L'option 3 reste le régime transitoire de fait**, non par choix : les écrans non portés continuent de fonctionner en formulaires et HTML aussi longtemps qu'ils ne sont pas reprises. La cohabitation est durable — 1 669 templates dust ne seront pas réécrits.

### Pourquoi les autres ont été écartées

- **Option 2** — un modèle de composants qui reçoit du HTML étranger entre en conflit avec sa propre réconciliation du DOM, et le défaut de périmètre de la zone remplacée subsiste. Elle reconduirait la classe de bug qu'on cherche à éliminer.
- **Option 3 comme cible** — deux formats d'échange maintenus indéfiniment doublent les chemins de code et les modes de défaillance, sans bénéfice une fois le JSON en place. Acceptable en transition, pas comme état stable.

## Consequences

- Bon : le bug de la zone trop étroite **disparaît par construction** — la visibilité d'un élément se dérive de l'état, et il se rend où qu'il soit dans la page.
- Bon : ouvre l'inférence de types côté front et la dérivation d'un contrat, si un schéma isomorphe est retenu.

- Neutre : question ouverte soulevée par l'équipe — faut-il **générer les types TypeScript depuis un contrat OpenAPI** pour éviter la dérive back/front, ou les écrire à la main comme dans le POC ? À trancher séparément.

- Mauvais : **exige un mécanisme de validation d'API côté serveur** avant de pouvoir exposer du JSON sérieusement. igo n'a aucun outillage de contrat — OpenAPI, Swagger ou JSON-schema — à ce jour.
- Mauvais : les routes `/api` du POC ont été **dupliquées** depuis l'existant. À terme il faudra décider si les deux surfaces cohabitent ou si les vues serveur sont retirées écran par écran.

## More Information

Cette décision rend nécessaire [Stratégie de validation](strategie-de-validation.md) : en cessant d'échanger des formulaires, elle met hors jeu la validation orientée formulaire d'igo et oblige à statuer sur son remplacement. La dépendance est à sens unique — celle-ci se tient seule.

Le défaut de périmètre est constaté dans `ladom/js/document-upload.js`. La démonstration du modèle JSON est le POC React sur l'espace stagiaire de certigo, 20/08/2026.
