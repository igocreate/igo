# Empaquetage de l'application

**Statut** : **accepté** — éprouvé en production sur ladom le 9 novembre 2026
**Date** : 2026-09-18, révisé le 2026-11-26
**Portée** : tous les projets. Les projets existants migrent un par un, à leur rythme.

## Context and Problem Statement

L'agence déploie ses applications Node.js par recettes Ansible : `git pull` sur la machine cible, `npm ci`, build, redémarrage sous pm2. L'équipe juge cet existant stable, simple et peu coûteux en maintenance — le statu quo est une option sérieuse.

Deux problèmes sont nommés : **le patch management** (rarement fait, donc retard de sécurité) et **la divergence d'environnement d'exécution**.

**Faut-il continuer à déployer du code source sur une machine préparée, ou livrer une image contenant l'application et son environnement ?**

### L'état de l'environnement d'exécution

**Rien ne fixe l'environnement, et il diverge.**

- **Cinq versions de Node différentes** sont déclarées à travers le parc — provisionnement, déploiement, postes de développement, intégration continue. Aucune ne connaît les autres, et l'outil employé bascule la version *de toute la machine* : la version effective dépend de la dernière commande lancée, pas d'une déclaration. Rien n'enregistre celle qui tourne réellement.
- **~50 paquets système installés en `state=latest`**, dont toute la chaîne de rendu d'images et de PDF : ce que reçoit une machine dépend de la date de son provisionnement, et les environnements ne sont pas provisionnés le même jour.
- **La distribution est une contrainte réelle que rien ne porte** — un paquet se comporte différemment selon la version d'Ubuntu, sans qu'aucun artefact ne la déclare.
- **Le socle n'est pas homogène** : deux images de machine coexistent en production, dont une maison dont ni la construction ni le contenu ne sont documentés.

L'environnement est donc **déjà** porté par une image — mais une image que rien ne versionne ni ne reconstruit à l'identique. **La question n'est pas s'il faut une image, c'est laquelle** : celle de la machine, ou celle de l'application.

## Decision Drivers

- **La divergence d'environnement** — problème nommé, et documenté ci-dessus.
- **Le patch management** — problème nommé.
- **Le coût de migration compte autant que le gain** — l'existant fonctionne ; une alternative doit justifier ce qu'elle coûte à mettre en place.
- **Pas de complexité pour rien** — une option qui ajoute de l'outillage doit résoudre un problème constaté, pas anticipé.

## Considered Options

1. **Statu quo** — déploiement Ansible : `git pull`, `npm ci`, build, pm2.
2. **Statu quo durci** — mêmes mécanismes, versions figées.
3. **Image Docker** — construite en CI, promue sans reconstruction.
4. **Image de machine versionnée** — type Packer.

## Decision Outcome

**Option 3 — empaqueter l'application en image Docker, construite en intégration continue, promue sans reconstruction.**

C'est la seule option qui rende l'environnement d'exécution **reproductible et vérifiable**, et non seulement déclaré : l'option 2 règle la divergence sur le papier mais laisse l'état réel des machines invérifiable, et l'option 4 y parvient au grain de la machine, pour un outillage équivalent et un écosystème plus étroit.

**Applicable immédiatement aux nouveaux projets, et le parc existant y migre progressivement.** Révision du 26/11/2026 : la migration du parc est décidée, projet par projet et sans date imposée. Elle est ce qui ouvre l'accès aux conteneurs managés retenus par [Modèle d'exécution](modele-d-execution.md) — une plateforme de ce type n'accepte qu'une image applicative. Un projet dont l'infrastructure n'est pas documentée relève d'abord d'un relevé de l'existant.

Ce que la décision recouvre :

- **Une seule déclaration de version par projet** — l'image de base fixe Node, la distribution et les paquets système.
- **Build en CI**, image taguée par le SHA du commit et poussée dans un registre.
- **Promotion sans reconstruction** : le même artefact traverse les environnements.
- **Le SHA du commit est porté dans l'image**, donc interrogeable à l'exécution.
- **Processus non privilégié**, et point de santé exposé.

## Pros and Cons of the Options

### Option 1 — statu quo

- Bon, parce qu'aucun outil nouveau et un coût de migration nul.
- Bon, parce que là où il est codifié dans un dépôt versionné, il fonctionne et l'équipe le maîtrise.
- **Mauvais, parce qu'il ne peut pas répondre à la divergence : elle en est la conséquence directe.** Cinq déclarations de version et `state=latest` sur cinquante paquets ne sont pas des défauts d'application du modèle, ils en sont le fonctionnement normal.
- Mauvais, parce que le build s'exécute sur la machine de production.
- Mauvais, parce qu'un `git pull` sur un nom de branche ne laisse aucune trace de ce qui tourne.

### Option 2 — statu quo durci

- Bon, parce qu'il règle la divergence sans rien introduire, à coût quasi nul et dans un outillage maîtrisé.
- Bon, parce qu'il est réversible et incrémental.
- **Mauvais, parce qu'il rend l'environnement déclaré, pas reproductible.** Une machine épinglée reste le produit de son historique d'`apt` : rien ne garantit que deux machines ayant reçu les mêmes rôles à six mois d'écart soient identiques, et rien ne permet de le vérifier.
- Mauvais, parce qu'il demande une discipline permanente là où l'image demande une décision unique — et le parc montre que cette discipline n'a pas tenu.
- Mauvais, parce que le déploiement reste un `git pull` et le build reste en production.

### Option 3 — image Docker

- Bon, parce qu'**une seule déclaration porte l'environnement**, et que son contenu est vérifiable.
- Bon, parce que **l'artefact déployé est celui qui a été testé** — plus de reconstruction par environnement.
- Bon, parce que le build quitte la production et que le rollback devient le redéploiement d'un tag.
- Bon, parce que les applications du parc sont déjà prêtes : configuration par variables d'environnement, sessions en cookies chiffrés, aucune écriture sur le disque local.
- Bon, parce qu'une image applicative est le format d'entrée des plateformes conteneurisées — elle laisse ces options ouvertes sans obliger à les prendre.
- Neutre, parce que l'OS hôte reste à patcher.
- Mauvais, parce que l'agence prendrait une chaîne d'outils qu'elle n'opère pas encore pour ses propres projets, et un registre à exploiter.
- Mauvais, parce que les daemons auxiliaires devront être joints par le réseau.

### Option 4 — image de machine versionnée

- Bon, parce qu'elle répond au même besoin, et qu'elle est déjà amorcée sans changer le modèle d'exécution.
- Bon, parce qu'elle couvre l'environnement complet, y compris ce qui vit hors de l'application.
- Mauvais, parce qu'elle demande **le même effort d'outillage pour un écosystème bien plus étroit** : pas de registre standard, pas d'exécution locale équivalente.
- Mauvais, parce que **le grain est la machine** : une montée de version applicative redéploie un serveur entier.
- Mauvais, parce qu'elle ferme l'accès aux plateformes conteneurisées, qui n'acceptent que des images applicatives.

## Consequences

- **Bon : tout le dispositif pm2 disparaît**, y compris les deux tâches qui verrouillent `dump.pm2` — fichier que pm2 recrée world-readable avec les secrets en clair, et qu'elles n'existent que pour réparer.

- **Neutre : ce que pm2 assurait est repris par le moteur de conteneurs.** pm2 rend trois services — relance après crash, démarrage au boot, cycle de vie du process — qu'un moteur de conteneurs rend nativement, par politique de redémarrage et service système activé au boot. **Mais c'est une pièce à installer et maintenir sur chaque hôte**, là où pm2 était un paquet npm.
- **Neutre : le patch management est déplacé, pas résolu.** Le système hôte reste à patcher — cela relève du choix d'hébergement, que cet ADR ne tranche pas. Ce qui change : l'application cesse de dépendre de l'état de cet hôte, et patcher son environnement devient une reconstruction datée plutôt qu'une intervention sur une machine vivante.
- **Neutre : Ansible ne disparaît pas.** Hôte, réseau et services attachés à la machine restent de son ressort. Règle de partage : **ce qui varie par environnement reste hors de l'image**, sinon elle cesse d'être promouvable sans reconstruction.

- **Mauvais : ce qui était joint par socket locale devra l'être par le réseau.** Deux garanties implicites sont à reconstruire : la relance d'un daemon tombé, et le comportement de l'application quand il ne répond pas.
- **Mauvais : le coût de mise en place n'est pas chiffré.** Cinq postes — écrire l'image, monter la chaîne de construction, provisionner un registre, installer le moteur de conteneurs sur les hôtes, reprendre les recettes de déploiement. **Aucun n'a été estimé**, et l'ordre de grandeur diffère entre un projet neuf et un existant, où il s'ajoute à un déploiement qui fonctionne.

## Confirmation

Les quatre points sont levés — ladom a servi de premier cas, de la première image (07/10/2026) à la mise en production conteneurisée (09/11/2026).

1. ~~**Chiffrer la mise en place**~~ — fait sur ladom, les cinq postes ont été traités. Le chiffre reste propre à ce projet, et la décision ne l'attend plus.
2. ~~**Mesurer le build en CI**~~ — le build a quitté la production. Le coût dominant n'est pas le temps de build mais la **taille de l'image** : ~3 Go pour ladom, qui porte Chrome. D'où deux règles nées de l'exploitation : l'installation de Chrome dans une couche placée avant les `node_modules`, pour qu'un changement de lock ne la reconstruise pas, et un `docker image prune` après chaque déploiement, sans quoi les images tirées s'accumulent jusqu'à l'alerte de disque.
3. ~~**Vérifier les daemons joints par socket locale**~~ — traité sur ladom par `network_mode: host` et le montage de la socket de l'hôte (`/run/clamav`). Le cas « application en conteneur, daemons et nginx sur l'hôte » est donc éprouvé.
4. ~~**Traiter `SIGTERM` dans le serveur HTTP**~~ — **livré dans `@igojs/server` 6.4.0** : `app.run()` installe un arrêt ordonné (503 sur la sonde de disponibilité, attente de `config.shutdownDelay` pour que le répartiteur retire l'instance, fermeture du serveur pendant que les requêtes en cours finissent, puis `config.onShutdown`), plafonné par `config.shutdownTimeout`. La condition bloquante est levée pour tout projet igo.

Ce que l'exploitation a ajouté, et qui n'était pas anticipé :

- **Les fichiers de diagnostic.** Un OOM laissait un core de ~4 Go par incident, illisible sans outillage et rempli de données personnelles. Remplacé par `ulimits: { core: 0 }` et un instantané de tas (`--heapsnapshot-near-heap-limit`) dans un volume à rétention courte.
- **`husky` n'a rien à installer hors d'un dépôt git** : `npm pkg delete scripts.prepare` avant l'installation des dépendances, sinon le build de l'image échoue.

## More Information

L'agence construit déjà des images de ce type sur un autre projet : multi-étages, version de base épinglée, promotion par re-tag, SHA du commit embarqué, non-root, healthcheck — voir la comparaison funecap de l'étude d'empaquetage et d'hébergement (septembre 2026), dont cet ADR est issu. **Rien de cela ne vient de Kubernetes** : tout vient du Dockerfile et de la chaîne de construction, ce qui rend la décision indépendante du choix d'hébergeur et du modèle d'exécution.

Le squelette `fullstack` met la décision en œuvre : un `Dockerfile` par artefact, construits par `_.github/workflows/image.yml`, taggés par le SHA et promus sans reconstruction. Voir `deploy/README.md`.

**Une image par build, pas par environnement.** Une image promue sans reconstruction ne peut pas porter de valeur propre à un environnement : ce qui varie est lu au démarrage du conteneur. Pour le front, cela interdit les variables `VITE_*`, inlinées dans le bundle et figées par la minification — le build pose des marqueurs dans `index.html`, qu'un point d'entrée remplace au démarrage. C'est la règle de partage énoncée plus haut (*ce qui varie par environnement reste hors de l'image*), appliquée au cas particulier d'un front statique. Arbitré sur ladom le 06/11/2026.
