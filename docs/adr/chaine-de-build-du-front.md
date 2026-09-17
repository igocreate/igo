# Chaîne de build et de déploiement du front

**Statut** : accepté  
**Date** : 2026-08-21

## Context and Problem Statement

L'ADR [Architecture front de référence](architecture-front-de-reference.md) a tranché la cible — front à composants buildé en assets statiques, API JSON, **un artefact**, assets servis par nginx. Il n'a pas dit **où vit la source du front**, **où tourne son build**, ni **comment on développe**.

Trois contraintes de l'existant cadrent la question :

- `ovh-ladom2` construit **sur le serveur** au déploiement : `npm ci` puis `npm run webpack-prod` dans une tâche Ansible. Le déploiement enchaîne `pm2 delete` et `pm2 start`, avec sa fenêtre d'indisponibilité. **Six environnements.**
- nginx sert déjà les statiques (`try_files $uri @app`). igo ne les sert pas.
- **Le seul « Mauvais » chiffré de l'option retenue** était la cohabitation de deux chaînes de build dans un même projet npm, jugée complexe par l'équipe — *« un projet vierge aurait été plus simple »*.

## Considered Options

**Où vit la source du front**

1. **Dans le projet npm existant** — une seule arborescence, deux chaînes de build à faire cohabiter.
2. **En projet npm frère, dans le même dépôt** — deux `package.json`, deux jeux de dépendances, un dépôt.
3. **Dans un dépôt séparé** — cycle de vie indépendant, artefact publié puis récupéré.

**Où tourne le build**

A. **Sur le serveur**, pendant le déploiement, comme le webpack actuel.
B. **En CI**, avec un artefact déposé que le déploiement recopie.

## Decision Outcome

**Option 2 + A : un dépôt par projet, front en projet npm frère du back, buildé sur le serveur au déploiement.**

- **Un dépôt par projet applicatif**, contenant le front et le back côte à côte. Pas de dépôt front partagé entre projets.
- **Le front est une SPA Vite ordinaire.** Sur ses routes, il possède la page entière : sa coquille est son propre `index.html`, produit par le build, servi par nginx. **Aucun template serveur n'intervient, donc aucun manifeste à lire côté back et aucune conditionnelle dev/prod dans un template.** Le motif des intégrations back de Vite (`vite_rails`, `django-vite`) ne s'applique pas ici : il n'existe que parce que le back rend la page.
- **Build sur le serveur** : une tâche Ansible de plus, à côté de celle qui existe. Les statiques produits sont recopiés dans le répertoire servi par nginx.
- **En développement** : serveur de dev Vite avec rechargement à chaud, et un **proxy `/api` vers le port d'igo**. Le navigateur voit tout en même origine, donc le cookie de session passe sans CORS.
- **Les URL d'API sont relatives** (`/api/...`). C'est ce qui permet au même `index.html` haché de fonctionner dans les six environnements sans être recompilé par environnement.

### Pourquoi les autres ont été écartées

- **Option 1** — c'est exactement le point de friction mesuré. Deux répertoires frères avec leurs dépendances propres ne cohabitent pas, ils se juxtaposent : le problème disparaît au lieu d'être géré.
- **Option 3** — elle règle la friction de build, mais introduit une discipline de version entre deux dépôts : quelle version du front est déployée avec quelle version de l'API. Le dépôt unique rend cette cohérence **gratuite** — un commit porte un front et un back cohérents.
- **Un dépôt front partagé entre projets** — il ferait monter les versions une fois au lieu de N, mais imposerait la montée à tous les clients en même temps, alors que chaque projet a son budget et son go. Il mettrait aussi à portée de main le paquet interne partagé que l'ADR [Système de design](systeme-de-design.md) a refusé.
- **Option B** — meilleure sur le fond, prématurée ici. Elle demande de décider où vit l'artefact et d'ajouter un maillon à la chaîne, pour un risque qui ne s'est pas encore matérialisé. *Pas de complexité pour rien.*

## Consequences

- Bon : **la cohérence front/back est structurelle**, pas procédurale. Un commit, un déploiement, un artefact — conforme au mode de livraison décidé.
- Bon : la friction de cohabitation des chaînes de build **disparaît**, sans rien construire pour l'éviter.
- Bon : le développement du front est celui de n'importe quel projet Vite. Rien de spécifique à igo à apprendre, sauf le proxy.
- Bon : **l'existant n'est pas touché.** La tâche webpack actuelle continue de tourner à l'identique.

- Neutre : six environnements, six builds. C'est déjà le régime actuel — pas de régression, pas d'amélioration.
- Neutre : le passage en CI reste ouvert et **peu coûteux** : c'est un déplacement de tâche, il ne remet aucune décision en cause.

- Mauvais : **le build reste sur la production.** Le pré-mortem avait soulevé le scénario du build qui échoue faute de mémoire et laisse l'application entre deux états. Ce risque est reconduit et **assumé**. Sortie identifiée : basculer en CI.
- Mauvais : un `index.html` construit à l'avance **ne peut rien recevoir du serveur**. Pas d'utilisateur pré-sérialisé, pas de jeton dans une balise `meta`. Le front démarre par un appel du type `/api/me`, avec l'état de chargement initial que ça implique. Acceptable ici — SEO et web perf non critiques — mais c'est une contrainte, pas un détail.

## Confirmation

Trois vérifications avant le premier déploiement en production :

1. **Ce que consomme le build Vite sur le serveur**, en mémoire et en temps, comparé au `webpack-prod` actuel. Si l'écart est significatif, l'option B se justifie tout de suite.
2. **Le proxy de développement face à la session d'igo** — que le cookie et les redirections d'authentification traversent bien.
3. **La configuration nginx du sous-espace front** : `try_files` doit retomber sur son `index.html` pour que le routage client fonctionne, et cet `index.html` **ne doit pas recevoir `expires max`** — les notes d'implémentation de l'ADR d'architecture le signalent déjà comme fatal.

## More Information

Cette décision met en œuvre [Architecture front de référence](architecture-front-de-reference.md) sans le contraindre : le choix du lieu de build est réversible dans les deux sens.

Le refus du dépôt front partagé prolonge l'arbitrage de [Système de design](systeme-de-design.md) — on copie, on possède, on accepte la divergence, plutôt que de reconstruire une couche maison partagée.

Le chiffre de la cohabitation des chaînes de build vient de l'atelier équipe du 19/08/2026.
