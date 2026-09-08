# Technologie de composants front

**Statut** : **accepté** — décision prise le 21 août 2026
**Date** : 2026-08-21
**Décideurs** : l'équipe et la direction

## Context and Problem Statement

L'architecture est décidée : front à composants buildé en assets statiques, consommant une API JSON exposée par le socle maison, livré en un artefact, assets servis par nginx. Rendu serveur, BFF et front à process propre sont écartés. Reste à choisir **dans quelle technologie les composants sont écrits**, pour trois à cinq ans, dans une agence de 5-6 personnes.

Contrainte héritée de l'architecture : **la possession se fait par route ou par sous-espace.** Une route donnée est servie soit entièrement par igo et dust, soit entièrement par le nouveau front — **jamais les deux mélangés dans une même page.** La cohabitation avec les 1 669 templates dust est donc durable, mais elle se joue **entre pages**, non dans une page.

Une recherche technique en dix dimensions a été menée les 20 et 21 août 2026. Elle n'établit pas d'ordre entre les deux premiers candidats.

## Decision Drivers

Pondérations arrêtées en atelier le 19 août 2026, révisées par les décideurs le 21. Échelle 0-5 où **5 = un mauvais résultat peut à lui seul écarter un candidat**.

| Poids | Critère | Ce que la recherche établit |
|:--:|---|---|
| 5 | Capacité réactive | **Ne discrimine pas** — la porte éliminatoire l'établit pour les trois |
| 5 | Testabilité des composants côté client | **Ne discrimine pas.** Poids maintenu : c'est une exigence, pas un départage |
| 5 | Écosystème de l'habillage | **Discriminant** |
| 4,5 | Effort de montée de version | **Discriminant** sur deux des trois modes d'effort — réécrire nos composants, adapter nos appels, remplacer une brique abandonnée — **et pas dans le même ordre** |
| 4-5 | Expérience développeur, sur la durée | **Non instruit.** Mesurable en interne |
| 4 | Recrutement et onboarding *(fusionnés)* | **Discriminant** |
| 4 | Facilité de détection d'un problème et observabilité | **Discriminant faiblement** — ~70 % du besoin est agnostique |
| 4 | Facilité de diagnostic et de réparation | **Discriminant faiblement** — les trois sont également aveugles à l'asynchrone |
| 4 | TypeScript | **Discriminant faiblement** — dans le bruit si l'agence reste sur TypeScript 6 |
| 3,5 | Robustesse de gouvernance du cœur | **Discriminant** |
| 3 | Exploitation — poids de bundle | **Discriminant** — facteur 3,3 entre les extrêmes |
| 3 | Documentation et communauté · compétences en place | Compétences : 4 personnes sur 6 sur React |

**Deux critères invoqués en discussion qui ne peuvent pas servir.** La **convergence React web / React Native** est un argument d'amortissement, donc de portefeuille : avec un seul projet mobile il est neutre ou défavorable, et la couche de partage d'UI est la moins bien livrée du dossier. La **qualité de l'assistance LLM** n'est pas instruite publiquement et ne peut être invoquée dans aucun sens.

## Considered Options

**Finalistes : React · Vue · Svelte.** Le filtre éliminatoire — monter une racine dans une page rendue par le serveur, un sous-espace à la fois — **est trivialement satisfait par les six candidats initiaux.** Il ne coupe personne, et il aurait fallu le formuler ainsi plus tôt : la recherche l'a instruit dans une acception plus exigeante — plusieurs racines indépendantes saupoudrées dans une page que le framework ne possède pas — qui n'est pas le besoin de l'agence.

Trois candidats sont écartés sur l'écosystème de l'habillage, le critère pondéré 5 qui a motivé le changement d'architecture :

| Écarté | Motif |
|---|---|
| **Preact** | Aucun paquet vivant dans **six des sept** catégories d'habillage — l'upload excepté, Uppy étant bâti sur Preact. Son écosystème est celui de React vu par `compat`, avec un blocage de plage démontré et **aucune preuve d'exécution en 2026** |
| **Solid** | Sa réponse à l'absence de bibliothèque complète est *headless*, donc elle **rend à l'agence la charge d'habillage qu'elle veut externaliser**. Facteur d'autobus de 1 sur le cœur, majeure en RC dans la fenêtre |
| **Lit** | **Désalignement de modèle** : seul candidat bâti sur les web components, donc à isolation Shadow DOM imposée par le navigateur. Comme la possession est par route, l'objection ne porte pas sur le CSS existant — elle porte sur le fait qu'**une bibliothèque tierce injectant son propre CSS global** (FilePond, Uppy, AG Grid) ne peut pas styler l'intérieur d'un composant, ce qui vaut même sur une page vierge. Y renoncer coûte la composition par slots. Sa virtualisation est par ailleurs sans publication depuis treize mois, sous préfixe `labs`. *(Retenir un kit de web components — Web Awesome, Vaadin, tous deux sur `lit ^3` — revient à adopter ce modèle par l'habillage.)* |

## Pros and Cons of the Options

### React

- Bon : seul pipeline de formation français en bootcamp, et le vivier le plus large — plus de mille offres contre 400 et une cinquantaine. **Les créations de projets vont dans le même sens et ne s'inversent pas** : environ treize fois celles de Vue et cinq fois celles de Svelte.
- Bon : dix systèmes de design majeurs vivants, et la bibliothèque DSFR la plus profonde.
- Bon : la distribution de contributeurs la plus plate des trois, adossée depuis février 2026 à une fondation à huit membres platine.
- Bon : **la possibilité de différer une montée de version** — correctifs publiés sur les mineures antérieures, avec une étiquette de rétroportage dédiée.
- Bon : plancher d'API dures le plus bas des trois — aucune dépendance non polyfillable. *Critère non pondéré, à intégrer si l'agence le veut.*
- Bon : aucun vérificateur TypeScript tiers, donc le gain de vélocité de TypeScript 7 y arrive d'abord.
- Bon : **un cycle de nettoyage rejoué en développement**, qui révèle sans test un abonnement non défait ou un effet qui double-soumet.
- Bon : 4 personnes sur 6 connaissent la stack.
- Mauvais : **le runtime le plus lourd — environ 60 Ko gzip**, contre 25 et 18. Sur un public mobile en outre-mer à terminaux datés, c'est 35 à 42 Ko de surcoût fixe par sous-espace servi.
- Mauvais : **l'écosystème où les faux amis sont les plus gros.** Plusieurs paquets à dizaines de millions de téléchargements hebdomadaires sont gelés depuis deux à quatre ans, dont celui du panneau glissant — l'un des trois besoins nommés. Choisir React impose d'acquérir **la curation comme compétence**.
- Mauvais : les transitions passent par une bibliothèque tierce à deux auteurs, là où Vue et Svelte les ont dans le cœur.
- Mauvais : seul des trois à ne pas publier ses définitions TypeScript.
- Mauvais : le moins outillé des trois pour être compris des agents de code.

### Vue

- Bon : **transitions dans le cœur**, sans dépendance tierce, sur la catégorie qui a motivé le changement.
- Bon : **l'effort de montée de version le plus faible sur le cœur** — dernière majeure en 2020, et la prochaine version n'est qu'une mineure.
- Bon : **la meilleure réponse à « pourquoi ça ne s'est pas rendu »** — l'énumération des dépendances effectivement suivies désigne la cause.
- Bon : environ 25 Ko gzip, deux fois et demie plus léger que React.
- Bon : le mieux documenté des trois sur l'adoption progressive dans une application existante.
- Bon : trois systèmes de design complets indigènes, dont React n'a pas d'équivalent à porter.
- Bon : franchit le seuil du vivier suffisant, avec un marché junior propre et aucune prime de salaire.
- Bon : bibliothèque DSFR réelle, adossée à une administration.
- Neutre : `vue-tsc` est requis pour vérifier les templates et bloqué sur TypeScript 6 — mais un chemin d'architecture est validé, et la dépréciation de l'outil est envisagée.
- Mauvais : **le cœur le plus concentré des trois** — près de la moitié des commits humains sur une seule personne, et le créateur hors du premier rang des contributeurs.
- Mauvais : **le financement de Vue en 2026 est inconnu.** C'est un trou, pas une conclusion : l'activité du dépôt est correcte.
- Mauvais : la prochaine mineure stagne en pré-publication depuis huit mois, et **le blog officiel n'a rien annoncé depuis septembre 2024**.
- Mauvais : deux références que la mémoire collective désigne encore sont à écarter comme socle.
- Mauvais : `shadcn-vue` et `reka-ui` sont des portages communautaires publiés par le même compte unique.
- Mauvais : aucun cursus français ne le prend comme framework principal ; l'offre est en formation continue courte.

### Svelte

- Bon : **les transitions les plus complètes du panel, dans le cœur**, y compris au montage et au démontage de la racine.
- Bon : **le plus léger — environ 18 Ko gzip**, facteur 3,3 contre React.
- Bon : **le seul à permettre une migration incrémentale** — l'ancienne syntaxe reste acceptée et les deux styles cohabitent composant par composant.
- Bon : les deux erreurs de réactivité les plus fréquentes remontent en avertissements du compilateur, **sans aucune configuration**.
- Bon : le mieux outillé des trois pour être compris des agents de code.
- Neutre : l'objection de rupture 3 → 5 est largement désamorcée par le mode de compatibilité.
- Neutre : le risque SvelteKit 3 ne s'applique probablement pas — dans cette architecture le routage reste serveur. **Non vérifié.**
- Mauvais : **le vivier de recrutement ne franchit pas le seuil**, et aucun cursus français n'a été trouvé. Choisir Svelte, c'est décider de former en interne, indéfiniment.
- Mauvais : **la couverture par les DS majeurs est la plus étroite** — quatre actifs dérivant de deux socles, et Tailwind Plus l'exclut explicitement.
- Mauvais : **aucune bibliothèque DSFR.** Le DSFR se ferait à la main sur le vanilla, avec le risque non instruit que son JS auto-initialisé se dispute la propriété du DOM.
- Mauvais : **son système de design a enchaîné trois majeures en dix-sept mois**, précisément là où le code est appelé partout.
- Mauvais : **aucun rétroportage de correctif** — pour un correctif il faut monter à la dernière mineure, et la cadence est élevée, donc subie.
- Mauvais : **plus d'inspecteur d'arbre maintenu**, et sa frontière d'erreur ne capture ni les gestionnaires d'événements ni l'asynchrone.
- Mauvais : deux bugs silencieux documentés sans détection — un état lu après un `await` n'est pas suivi, et la déstructuration d'un état réactif casse la réactivité.
- Mauvais : le support Webpack est en maintenance minimale.
- Mauvais : l'upload est le seul trou de sa grille d'habillage.

## Decision Outcome

### Matrice repondérable

Notes de performance de 0 à 5, distinctes du poids.

| Critère | Poids | React | Vue | Svelte |
|---|:--:|:--:|:--:|:--:|
| Écosystème de l'habillage | 5 | **5** | 4,5 | 3,5 |
| Testabilité des composants côté client | 5 | **4** | **4** | 3,5 |
| Effort de montée de version | 4,5 | **4,5** | **4,5** | 3,5 |
| Recrutement et onboarding | 4 | **5** | 4,25 | 1,75 |
| Facilité de détection et observabilité | 4 | **4,5** | 4 | 3 |
| Facilité de diagnostic et de réparation | 4 | **4** | **4** | 3,5 |
| TypeScript | 4 | **4,5** | 4 | 3,5 |
| Robustesse de gouvernance du cœur | 3,5 | **4,5** | 3,5 | 3,5 |
| Exploitation — poids de bundle | 3 | 2,5 | 4 | **4,5** |
| Compétences en place | 3 | **5** | 2 | 2 |
| Expérience développeur, sur la durée | 4-5 | non instruit | non instruit | non instruit |
| Capacité réactive | 5 | *ne discrimine pas* | *ne discrimine pas* | *ne discrimine pas* |
| **Total sur 200** | **40** | **175,5** | **158,0** | **129,5** |
| **En pourcentage** | | **87,8 %** | **79,0 %** | **64,8 %** |

**Quatre mises en garde de lecture, sans lesquelles la matrice se lit de travers :**

- **Un score affiché n'est pas un verdict.** React et Vue sont co-admissibles ; l'ordre dépend des poids, et il s'inverse sur les seuls critères techniques.
- **Poids et pouvoir discriminant sont deux choses distinctes.** Un critère peut peser 5 et ne pas séparer les candidats — c'est le cas de la testabilité et de la capacité réactive. Cela signifie « ça compte énormément, et les trois le servent », pas « il faut baisser le poids ». **Baisser un poids pour rendre l'arithmétique plus tranchante serait falsifier les priorités.**
- **Les notes de détection et de diagnostic sont resserrées volontairement** : environ 70 % de ces deux besoins repose sur de l'outillage agnostique identique aux trois. Les étaler serait faux.
- **Sur « pourquoi ça ne s'est pas rendu », React n'a pas été instruit.** C'est un trou de couverture, pas une preuve d'infériorité.

**Sensibilité.** Le poids de l'effort de montée de version ne déplace rien — 87,7 % à 4 contre 87,8 % à 5 — React et Vue y étant ex æquo. **C'est le poids des octets qui décide** : le ramener de 5 à 3 porte l'écart React/Vue de 6,9 à 8,8 points de pourcentage, les octets étant le principal contrepoids technique à React.

**Technologie retenue : React.**

**Ce qui a décidé, dans cet ordre :**

- **Les compétences en place.** Quatre personnes sur six la pratiquent au quotidien, et le projet mobile en React Native élargit cette base. Partir ailleurs, c'est former quatre à six personnes au lieu de deux — une asymétrie qu'un critère pondéré 3 ne capture pas.
- **Le vivier et le pipeline de formation.** Seul des trois à avoir des bootcamps français qui en produisent des juniors, et le vivier le plus large. Sur un critère pondéré 4 où l'attractivité est décrite en interne comme « un vrai challenge », c'est le seul écart qui se traduise mécaniquement en délai d'onboarding.
- **La gouvernance du cœur.** La distribution de contributeurs la plus plate des trois, adossée depuis février 2026 à une fondation à huit membres platine, et la seule des trois à publier des correctifs sur les mineures antérieures — donc la seule qui permette de différer une montée de version.
- **La profondeur DSFR**, sur le projet public.

**Ce que la matrice ajoute, et ce qu'elle n'ajoute pas.** Elle donne 87,8 % contre 79,0 % et 64,8 %, ce qui est cohérent avec ce qui précède — mais l'écart dépend des poids, et il s'inverse sur les seuls critères techniques. **La décision ne repose pas sur le score.** Elle repose sur les quatre faits ci-dessus, dont trois sont de première main.

**Deux faiblesses sciemment acceptées**, et c'est le principal apport de l'étude :

- **Le runtime le plus lourd du panel** — environ 60 Ko gzip contre 25 et 18 — sur un public mobile en outre-mer à terminaux datés. D'où le poids des pages comme point de vigilance, en conséquence.
- **L'écosystème où les faux amis sont les plus gros.** Plusieurs paquets à dizaines de millions de téléchargements hebdomadaires sont gelés depuis deux à quatre ans, dont celui du panneau glissant. D'où la liste de dépendances validée comme premier livrable.

**Ce que l'étude n'a pas changé, et il faut le dire** : c'est le candidat que l'équipe aurait retenu spontanément. Ce qu'elle a produit n'est pas la réponse, c'est **ce qu'il faut surveiller à partir du premier jour.**

### Consequences

Vraies quelle que soit l'option retenue, donc utilisables dès maintenant.

- **La liste de dépendances validée et datée, avec sa règle de révision, est le premier livrable** — avant la première ligne de code. Dix paquets vérifiés montrent que le classement par téléchargements désigne des paquets morts, et un modèle reproduit ce corpus mort avec assurance : c'est donc à la fois une hygiène humaine et **le garde-fou de l'assistance LLM**.
- **Le poids des pages est à surveiller.** Le public mobile en outre-mer le justifie seul. Chaque projet décide s'il se fixe un seuil, et comment il le vérifie.
- **Privilégier les dépendances agnostiques du framework** là où elles existent et sont maintenues : `zod`, le cœur TanStack, `motion`, `@floating-ui/dom`, Uppy. Ce sont les briques les mieux adossées du dossier.
- **Le RGAA 5 est annoncé pour fin 2026**, donc un changement de référentiel tombera pendant la durée de vie du choix.

## Confirmation

**Les cinq mesures préalables identifiées par la recherche ont été écartées par les décideurs.** Le choix n'étant pas serré — 8,8 points d'écart — et portant sur la technologie que quatre personnes sur six pratiquent déjà, elles auraient augmenté la confiance sans changer la réponse.

**Deux conséquences à assumer** : l'expérience développeur, pondérée 4-5, reste **non instruite** ; et la grille virtualisée de mille tuiles — le cas d'usage réellement mesuré par l'agence — reste couverte de façon vérifiée par **aucun candidat**.

Comment on saura, dans douze mois, si la décision était bonne :

- **Le compte de tests de composants**, aujourd'hui nul sur un critère pondéré 5.
- **La part de couverture qui ne repose plus sur l'end-to-end** — l'enjeu est de faire redescendre la vérification au niveau du composant, pas d'ajouter des tests lourds.
- **Le poids des pages**, et s'il a dérivé.
- **Le nombre d'interventions imputables à une dépendance morte** — mesure directe de l'efficacité de la liste validée.

## More Information

Cette décision **découle de** [Architecture front de référence](architecture-front-de-reference.md) : la possession par route et l'exclusion du rendu serveur en viennent. Elle **contraint** le [Système de design](systeme-de-design.md) : dix candidats en React, sept en Vue, quatre en Svelte.

Le rapport de recherche (dans le dépôt front-stack-study) porte les mesures, les sources datées et la passe adverse. **Il est daté du 20 août 2026 et doit être rafraîchi au-delà de février 2027.**

**Deux affirmations à refuser si elles apparaissent en réunion** : des chiffres de génération de code par framework présentés comme issus d'un benchmark académique, introuvables dans la source ; et le chiffre de « 50 000 € d'amende » sur l'accessibilité, non corroboré par le texte officiel.
