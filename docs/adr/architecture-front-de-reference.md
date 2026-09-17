# Architecture front de référence

**Statut** : accepté — pré-mortem passé le 20/08/2026  
**Date** : 2026-08-20  
**Décideur** : direction de l'agence  
**Portée** : projets dont l'agence assure le build **et** le run. Les projets de build seul peuvent recevoir une stack imposée par le client.

## Context and Problem Statement

Le front des applications igo repose sur jQuery : 126 modules, ~8 000 lignes réparties entre ladom et certigo, plus 1 669 templates dust. L'inventaire des besoins d'interactivité montre que **~85 % de la surface réactive exige un modèle de composants et d'état** ; une mise à jour partielle de HTML ne couvre que les ~15 % restants (filtres, tri, pagination).

`@igojs/component`, écrit pour répondre à ce besoin, est aujourd'hui fonctionnellement complet — composition, réconciliation de listes par clé, état partagé, événements parent↔enfant — mais **au strict minimum** : ni typage, ni transitions, ni testabilité applicative. Il a été construit en sept mois et demi par une seule personne, au rythme de huit releases entre le 21 mai et le 17 juin 2026, après avoir été prototypé dans certigo puis extrait.

La question n'est donc plus la capacité, mais le **coût de l'écran suivant**. Trois écrans évalués sur le code donnent un taux d'environ **un sur trois** déclenchant du travail de framework ou un contournement — et ce taux est **prévisible en nature** : le péage ne se déclenche pas sur la complexité de la logique mais sur l'habillage (animations, réinitialisation de plugins, tooltips), soit ~3 800 des ~5 850 lignes de surface réactive.

Deux refontes clientes, non encore confirmées, motivent une décision **prête en septembre 2026**, pour un horizon de 3 à 5 ans.

## Decision Drivers

Pondérations arrêtées par l'équipe en atelier le 19 août 2026, échelle 0-5 où **5 = un mauvais résultat peut à lui seul écarter un candidat**.

| Poids | Critère |
|:--:|---|
| **5** | Capacité réactive |
| **5** | Testabilité — *« aucun test front écrit aujourd'hui »* |
| **5** | Exploitation et stabilité en production |
| **5** | Coût de framework par écran porté |
| 4-5 | Expérience développeur, sur la durée |
| 4 | Attractivité au recrutement · richesse de l'écosystème · TypeScript · onboarding |
| 3-4 | Charge de maintenance et montées de version |
| 3 | Coût de mise en œuvre · documentation et communauté · compétences en place |
| 2 | Poids de bundle et performance mobile |

**Deux convergences distinctes, à ne pas confondre — leur fusion sous un seul libellé a produit un faux désaccord :**

| Critère | Ce que c'est | Position |
|---|---|---|
| **Convergence du socle technique** | Même framework sur tous les projets : les corrections de bugs se capitalisent, une seule chose à apprendre | **Équipe : pas déterminant** — *« avantage historique fort, capitalisation des bugs transverses, mais moins critique aujourd'hui »* |
| **Convergence des compétences et du paradigme** | Des personnes interchangeables entre projets web et mobile, un vivier de recrutement commun | **Direction : important.** Non retenu comme tel par l'atelier |

> **Divergence assumée, non tranchée ici.** Les deux positions portent sur des objets différents et peuvent être vraies simultanément ; le poids relatif à leur accorder fait partie de l'arbitrage. La seconde relève de l'**axe 2** — le choix de technologie de composants — et sera instruite dans l'ADR correspondant.

Contrainte transverse : **pas de complexité pour rien.** Le SEO et la performance web ne sont pas critiques sur les projets à ce jour.

## Considered Options

1. **igo + `@igojs/component`** — maintien, plus ajout des fonctionnalités manquantes.
2. **Front à composants buildé en assets statiques**, API JSON exposée par igo. Deux modes de livraison : **un artefact** (front dans le dépôt igo) ou **deux artefacts** (front livré à part).
3. **Le socle back entre dans le périmètre**, pour les **nouveaux projets uniquement** — axe distinct, ADR distinct.

> ⚠️ **L'option 2 ne désigne aucune technologie de composants.** Le POC est en React ; Vue, Svelte, Solid et Lit sont éligibles et **non évalués**. Ce choix relève d'un ADR distinct, qui ne peut être tranché qu'après celui-ci.

> **Écarté d'emblée : un front avec son propre serveur** — BFF ou rendu serveur. Les deux motifs sont absents : pas d'exigence SEO, et le BFF est jugé superflu *« si les API sont déjà bien conçues pour le front »*. À réexaminer si un secret doit rester hors du navigateur, ou si une API tierce doit être proxifiée.

## Pros and Cons of the Options

### Option 1 — igo + `@igojs/component`

- Bon : **un seul livrable, une seule instance.** La stabilité en production est une force constatée — *« les apps tournent bien, les mails de crash permettent une intervention rapide »*.
- Bon : **migration nulle**, aucun coût d'entrée.
- Bon : maîtrise totale — un besoin non couvert peut être ajouté sans attendre un tiers.
- Bon : `db`, `dust` et `server` sont matures et stables depuis dix ans.
- Bon : **4 personnes sur 6** travaillent sur la stack au quotidien.

- Mauvais : **coût de framework récurrent**, sur une seule personne, et découvert *« en butant en cours de route »* — donc non provisionnable.
- Mauvais : **aucun harnais de test côté client** — ni composant ni template.
- Mauvais : **pas d'écosystème natif** — le vanilla est enveloppé à la main, et c'est là que tombe le plafond constaté de ~8M opérations pour 1 000 tuiles, faute de virtualisation disponible.
- Mauvais : **attractivité au recrutement faible** — *« stack propriétaire perçue négativement par les juniors »*.
- Mauvais : pas de typage, props non validées, erreurs silencieuses (`user.name` sur `null` n'affiche rien et ne plante pas).
- Mauvais : `component` est la couche la plus jeune et la plus mouvante du framework — huit releases en quatre semaines.
- Mauvais : **l'assistance par LLM y est structurellement plus faible.** Un modèle a vu des quantités massives de code des stacks de marché et quasiment aucun code igo. Le facteur d'accélération que le chiffrage de ladom pose à ×2 n'est donc probablement pas le même des deux côtés. **Hypothèse non mesurée** — listée en dernier à ce titre.

### Option 2 — Front à composants buildé en assets statiques

- Bon : **testabilité, typage, écosystème et onboarding fournis** par l'écosystème.
- Bon : **coût de framework nul** — l'habillage manquant est déjà écrit ailleurs.
- Bon : **aucun process supplémentaire** — les assets sont servis par nginx. L'exploitation, critère à 5, n'est pas dégradée.
- Bon : **démontré par un POC** sur l'espace stagiaire de certigo, en **moins d'une journée**, SCORM inclus.
- Bon : corrige des défauts existants par construction — le bouton « Transmettre » absent après dépôt Ajax, le timer des tests théoriques mis en échec par les coupures réseau.
- Bon : même origine — pas de CORS, le cookie de session fonctionne tel quel, pas de pont d'auth.

- Neutre : **les compétences en place dépendent de l'axe 2, pas de celui-ci.** **4 personnes sur 6 connaissent React** — mais le chiffre tombe si une autre technologie est retenue, et il est inconnu pour Vue, Svelte, Solid ou Lit. Critère pondéré 3, donc peu structurant.
- Neutre : **l'assistance par LLM réduit le coût d'apprentissage** d'une stack nouvelle, ce qui affaiblit d'autant l'objection des compétences.
- Neutre : exige un mécanisme de validation d'API côté serveur — mais ce coût échoit aussi à l'option 1 dès qu'elle passe au JSON.

- Mauvais : dépendance à la cadence d'un écosystème externe — l'équipe cite *Svelte 3→5* en contre-exemple.
- Mauvais : **cohabitation Vite + Webpack sur un projet existant jugée complexe** — *« un projet vierge aurait été plus simple »*. Nul en greenfield.

#### Mode de livraison — un artefact ou deux

Aucun des deux modes n'ajoute de process : **nginx sert les assets dans les deux cas** (`try_files $uri @app`, le Node n'étant qu'un repli). Ce qui diffère est le cycle de vie.

| | **Un artefact** | **Deux artefacts** |
|---|---|---|
| **Cohérence front / API** | Garantie par construction · retour arrière atomique | **À discipliner** — désynchronisation possible. C'est ici qu'un contrat d'API explicite devient structurant |
| **Correctif front** | Redéploie tout, avec la coupure `pm2 delete` → `pm2 start` | Indépendant, sans coupure |
| **Tests E2E** | Dans le pipeline unique | À décider : ils traversent les deux artefacts |
| **Supervision** | Rien de neuf | Une cible de plus · invalidation de cache si CDN |
| **Livraison** | nginx existant | **CDN possible** |
| **Ce qu'on achète** | La **simplicité** : rien de neuf à superviser, cohérence garantie, un seul pipeline | L'**indépendance** : livrer le front sans coupure ni redéploiement de l'API, et la porte ouverte au CDN |
| **Ce qu'on paie** | Toute correction front redéploie l'application et paie la coupure `pm2` | Une discipline de contrat et de versionnement, plus une cible de supervision |

**Verdict du sous-axe.** **Un artefact est le choix par défaut** : c'est le chemin du POC, il ne demande aucune infrastructure nouvelle, et il est cohérent avec le critère d'exploitation pondéré 5. **Deux artefacts se justifient à deux conditions**, dont aucune n'est réunie aujourd'hui — que la coupure de déploiement devienne gênante en exploitation, ou qu'une livraison par CDN devienne nécessaire.

Sur ce second point, la tension mérite d'être notée : le contexte outre-mer plaide pour garder la porte ouverte — le vhost de production autorise nommément des IP de La Réunion, Guadeloupe, Guyane et un lien **Starlink à Mayotte** — mais l'équipe pondère la performance mobile à **2**, ce qui en réduit l'urgence. **Ce choix n'engage pas l'architecture** : il peut être tranché au premier déploiement réel, ou renversé plus tard sans rien réécrire.

### Option 3 — Le socle back entre dans le périmètre, pour les nouveaux projets uniquement

**Ce n'est pas une troisième architecture front.** C'est un choix d'architecture front (option 1 ou 2) **plus** une question distincte sur le socle serveur, restreinte au greenfield. Elle est listée ici parce que l'équipe l'a formulée comme un scénario, mais elle relève d'un axe propre et d'un ADR distinct.

**Ce que « remplacer le back » veut dire — et ne veut pas dire.** igo côté serveur, c'est Express plus un ORM, plus des conventions (routage par fichier, config, i18n, mail, cache, logs), plus une couche vue et une chaîne de build. À mesure que la couche vue est retirée — dust réduit aux PDF, forms hors sujet, webpack remplacé par Vite — **ce qui reste se concentre sur l'ORM et les conventions.** C'est là qu'est la valeur accumulée sur dix ans. Poser la question n'implique donc pas de quitter igo : la réponse peut être « on garde ».

Deux sous-questions indépendantes, avec des éléments internes déjà disponibles :

| Sous-question | Éléments constatés |
|---|---|
| **Express, ou autre ?** | *« Fastify plus performant sous charge, migration non triviale mais intéressante à explorer »* (démo du 20/08) |
| **`@igojs/db`, ou autre ?** | Pour : optimisations fines possibles — pattern de jointure custom. Contre : *« cache de requêtes potentiellement non optimisé sous forte charge, identifié sur Certigo »*. Comparaison non théorique : `api-ceremonie` tourne sous **MikroORM** chez funecap |

- Bon : **restreinte au greenfield, c'est une expérience sans risque** — pas de migration, pas de cohabitation, rien en jeu sur un existant qui tourne. C'est le seul endroit du parc où un socle back peut être évalué gratuitement.
- Bon : la variante Next.js + NestJS est éprouvée en interne et connue de trois personnes.
- Mauvais : multiplier les socles back dans une agence de six personnes va contre la convergence du socle technique, dont l'avantage historique est reconnu même par ceux qui le jugent moins critique aujourd'hui.
- Mauvais : **la variante Next.js est écartée par l'équipe** — *« complexité ajoutée sans bénéfice SEO réel ici »* — et elle implique un runtime supplémentaire.

**Différée** : sans objet tant qu'aucun projet neuf n'est lancé, et à instruire alors dans son propre ADR.

## Decision Outcome

**Option 2 retenue : un front à composants buildé en assets statiques, consommant une API JSON exposée par igo. Mode de livraison : un artefact** — le front vit dans le dépôt igo et se déploie avec lui.

### Ce qui a décidé

Sur les quatre critères pondérés 5, **deux ne discriminent pas et deux tranchent**.

- **La capacité réactive ne discrimine pas.** Le socle réactif d'`@igojs/component` est complet — état, dérivation, composition, listes par clé, store, événements parent↔enfant. `planner/sessions`, le plus gros module jQuery du parc, est portable sans rien ajouter. **L'option 1 n'a pas été écartée pour une insuffisance du modèle réactif.**
- **L'exploitation plaidait pour l'option 1, et le mode un artefact referme l'écart.** nginx sert déjà les assets sur le parc existant ; le front buildé s'y insère sans process supplémentaire. Un déploiement, une supervision, retour arrière atomique.
- **La testabilité tranche, et c'est le vrai problème d'igo — d'où le poids de 5.** Le JS existe en volume et **n'est jamais testé** : le seul filet est une poignée d'E2E, trop lourds pour être nombreux, qui tiennent lieu de tests de composants. Vérification faite dans les sources : `@igojs/component` a ses propres tests, mais **aucun harnais pour tester un composant applicatif côté client** — pas d'environnement DOM dans la chaîne, pas d'utilitaire de montage exporté, et les tests du framework le montrent en creux en n'instanciant aucun composant. En option 1 ce harnais reste à construire ; en option 2 c'est une commodité qu'on installe.
- **Le coût de framework par écran tranche, et pour une raison de maturité plus que de taux.** Le taux passé — une intervention par écran porté, puis environ un écran sur trois sur les trois cas évalués — est une borne haute gonflée par la genèse. Mais le jugement du mainteneur ne porte pas sur un taux : **le péage reste probable tant que la couche n'a pas la maturité de `@igojs/server` ou de `@igojs/db`.** Or cette maturité s'achète en temps et en volume d'usage — dix ans sur tout le parc pour les deux paquets mûrs, contre la capacité résiduelle d'une personne pour la couche front. À l'échelle d'une agence de 5-6, l'asymétrie ne se referme pas.

Le péage est par ailleurs **caractérisé** : il ne se déclenche pas sur la complexité de la logique mais sur l'habillage — animations, plugins à réinitialiser, tooltips — soit, d'après la ventilation de l'inventaire, environ 3 800 des ~5 850 LOC de surface réactive. C'est précisément le domaine qu'un écosystème de composants couvre, et c'est ce qui rend le critère « richesse de l'écosystème » structurant plutôt que confortable.

Tous les critères pondérés 4 et 4-5 — expérience développeur, écosystème, attractivité, TypeScript, onboarding — vont dans le même sens. Le seul qui tire vers l'option 1 en dehors de l'exploitation est « compétences en place », pondéré 3.

### Ce qui n'a pas décidé, et qu'il faut dire

- **Le coût déjà engagé sur `@igojs/component`** — de quelques jours à quelques semaines. Il est derrière et n'a pesé dans aucun sens.
- **La continuité du socle** — plusieurs personnes savent le maintenir, une seule en a la maîtrise fine — tenue volontairement hors de la matrice : c'est un sujet d'organisation, pas de technologie.
- **La convergence des compétences et du paradigme**, importante pour la direction, qui relève de l'axe 2 et non de celui-ci.
- **Aucune technologie de composants n'est retenue par cette décision.** Le POC est en React ; Vue, Svelte, Solid et Lit restent éligibles et non évalués.

### Pourquoi un artefact plutôt que deux

Le mode un artefact **neutralise le seul critère à 5 qui plaidait pour rester** : il conserve le livrable unique, la supervision unique et le retour arrière atomique, tout en donnant accès à l'écosystème. Le mode deux artefacts reste disponible plus tard — le front étant buildé en assets statiques dans les deux cas, le passage de l'un à l'autre ne remet pas le front en cause. Rien n'oblige à payer maintenant une séparation dont le besoin n'est pas établi.

### Consequences

- Bon : **la testabilité devient un choix d'installation, non un chantier de framework.**
- Bon : **le péage sur l'habillage est transféré à un écosystème** dont d'autres paient la maturité.
- Bon : **plus fort que prévu sur la catégorie la plus douloureuse.** La recherche de l'axe 2 a établi que les transitions et animations — le manque nommément identifié par la rétrospective, ~3 800 des 5 850 lignes exposées — sont fournies **par le cœur** de Vue et de Svelte, sans aucune dépendance tierce. Ce n'est donc pas un écosystème à surveiller, c'est un acquis de plateforme.
- Bon : **igo se recentre sur ses deux paquets mûrs** — Express et l'ORM. Ce n'est pas un désaveu du socle, c'est un rétrécissement vers ce qu'il fait de mieux depuis dix ans.
- Bon : sortir de jQuery **débloque la migration vers Vite**, aujourd'hui empêchée par l'incompatibilité du chargement parallèle. Gain non attribuable à cette option — l'option 1 l'aurait aussi obtenu.
- Neutre : **les compétences en place restent inconnues** jusqu'à l'axe 2. Quatre personnes sur six connaissent React, mais le chiffre ne vaut que pour React.
- Neutre : **aucune migration d'existant n'est engagée.** Chaque refonte se décide ensuite, projet par projet, en cohabitation durable avec les 1 669 templates dust. Le build ne doit pas présupposer une reprise intégrale.
- Mauvais : **l'axe 2 devient bloquant.** Aucune mise en œuvre n'est possible avant de choisir la technologie de composants, et ce choix demande de la recherche externe.
- Mauvais : **exige un mécanisme de validation d'API côté serveur** avant d'exposer du JSON sérieusement. Coût de framework à payer une fois, sur la personne déjà chargée.
- Mauvais : **`@igojs/component` passe en maintenance.** Les six écrans de certigo restent supportés, pas étendus. À acter explicitement, faute de quoi la couche dérive sans porteur.
- Mauvais : **la décision concentre le back sans alléger sa maintenance.** En rétrécissant igo à l'API et à l'ORM, on rend ces deux paquets *plus* porteurs. Plusieurs personnes savent les maintenir et l'assistance par LLM abaisse le coût de reprise : le risque de continuité est modéré, mais il se déplace vers le back au lieu de disparaître.
- Mauvais : **elle peut rester longtemps inexécutée**, les deux refontes n'étant pas confirmées. Elle vaudra alors pour le premier projet neuf, quel qu'il soit — mais chaque écran porté en `@igojs/component` dans l'intervalle augmente le coût de son application.

## Confirmation

Comment on saura, dans douze mois, si la décision était bonne :

- **Coût de framework par écran porté** — la mesure qui a fondé la décision. Il doit tendre vers zéro dans l'option 2 ; il reste à surveiller dans l'option 1.
- **Existence de tests de composants** — aujourd'hui aucun, le JS n'étant jamais testé hors quelques E2E. Un an plus tard, un compte encore nul signifierait que la décision n'a pas produit son effet, et que le blocage n'était pas l'outillage mais l'habitude ou le budget.
- **Part de la couverture qui ne repose plus sur l'E2E** — l'enjeu n'est pas d'ajouter des tests lourds, c'est de faire redescendre la vérification au niveau du composant, où elle est rapide et bon marché.
- **Boucle de retour** mesurée (temps entre l'enregistrement d'un fichier et le résultat visible), à comparer au relevé initial.
- **Bus factor par couche** — nombre de personnes capables de faire évoluer chaque couche, seuil d'alerte en dessous de deux.
- **Garde-fou de réversibilité** : la première mise en œuvre se fait sur un périmètre abandonnable — un espace utilisateur isolé par sous-domaine — de façon qu'un retour arrière reste possible sans toucher au reste du parc.

## Notes d'implémentation

Deux réglages nginx à traiter dès la première mise en œuvre de l'option 2, valables quel que soit le mode de livraison. Ils ne pèsent pas sur la décision mais ne doivent pas se découvrir en production.

- Le vhost applique `expires max` à tout `location /`. **Fatal sur `index.html`** : l'utilisateur garderait un fichier référençant des assets disparus. Il faut une `location = /index.html` à cache court — les autres assets étant déjà versionnés par empreinte.
- `try_files $uri @app` envoie les URL inconnues au Node. Un routage client a besoin d'un repli sur `index.html`.

## More Information

**Éléments de preuve** : inventaire du besoin de réactivité, rétrospective du coût de framework, atelier équipe du 19/08/2026, POC React sur l'espace stagiaire de certigo du 20/08/2026. Le [cadre de décision](../cadre-decision-stack-front.md) en tient l'index.

**Sujet distinct, volontairement hors comparatif** : la continuité du socle igo — maîtrise inégalement répartie, coût de reprise abaissé par l'assistance LLM — à traiter quelle que soit l'issue de celle-ci.
