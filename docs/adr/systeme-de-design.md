# Système de design

**Statut** : **accepté** — décision prise le 21 août 2026  
**Date** : 2026-08-21  
**Décideurs** : l'équipe et la direction

## Context and Problem Statement

Le choix d'un système de design a été isolé de celui de la [technologie de composants](technologie-de-composants-front.md) parce qu'il n'obéit pas aux mêmes critères : c'est d'abord une décision de produit et d'identité visuelle. Mais les deux se contraignent, et il faut savoir dans quel sens.

Deux contraintes de contexte, établies par la recherche du 20 août 2026 :

- **Le DSFR est un critère de projet, pas de socle.** Ses Modalités d'Utilisation en interdisent l'usage hors administration et hors domaine `.gouv.fr` : le projet privé de l'agence ne peut pas l'utiliser, même par choix esthétique. Il ne pèse donc que sur un projet (ladom).
- **L'accessibilité, elle, est devenue un critère de socle.** Le décret n° 2023-931 est en vigueur depuis le 28 juin 2025 et couvre le commerce électronique, les services bancaires et le transport. L'exonération vise les entités de moins de dix personnes — donc le client, pas l'agence.

## Decision Drivers

- **Neutralité visuelle** : le DS doit se thématiser par client, sans imposer une identité reconnaissable.
- **Couverture fonctionnelle** : virtualisation, transitions, tableaux, sélecteurs riches, upload, tooltips et modales.
- **Maintenance réelle** — première main ou portage communautaire, nombre de mainteneurs, cadence.
- **Licence, et sa stabilité dans le temps.**
- **Accessibilité livrée**, pas seulement annoncée.
- **Coût de montée de version** : un DS est appelé depuis chaque composant, donc une majeure de portée composant se paie partout.

## Considered Options

**Le vrai choix porte sur une approche, pas sur un produit.** Le produit suit. Et l'arbitrage se résume à une tension : **l'étendue du prêt-à-porter contre la cohérence d'un seul système de jetons.**

Trois approches, toutes cohérentes. Tailwind est déjà en place sur les projets existants, donc il est présent dans les trois.

### A. Système de design stylé, plus Tailwind pour nos composants

*Produits : MUI et son extension MUI X · Mantine · Ant Design*

- Bon : **le chemin le plus rapide au premier écran livré.** MUI donne une soixantaine de composants immédiatement, et son extension payante couvre les trous que personne d'autre ne couvre gratuitement — tableau de données complet, sélecteurs de dates, graphiques.
- Bon : **la charge d'habillage est réellement externalisée**, ce qui est l'objectif de départ. Quelqu'un d'autre maintient les animations, les tooltips, l'accessibilité des composants.
- Bon : **les éditeurs soutiennent officiellement la combinaison.** MUI publie une page d'intégration Tailwind 4 avec `enableCssLayer` et un ordre de couches explicite ; Ant Design documente le même mécanisme. Ce n'est pas du bricolage.
- Bon : sur les critères de montée de version, MUI livre **des codemods pour plus de quarante composants**.
- Neutre : la friction historique — les styles du DS gagnant sur les classes utilitaires — **est résolue par les couches en cascade**. Toute recette à base de `!important` global est antérieure au moteur v4.
- Neutre : le socle de configuration est à écrire une fois et à ranger dans le gabarit de démarrage. Non trivial, mais non répétitif.
- Mauvais : **deux systèmes de jetons, et le pont est du code maison.** Aucun éditeur ne publie de fichier `@theme` prêt à importer : l'équipe écrit et maintient elle-même le mappage entre les jetons du DS et ceux de Tailwind. Ce code **casse silencieusement quand le DS renomme un jeton**, à chaque majeure et sur chaque projet. C'est le coût réel de cette approche.
- Mauvais : **deux vocabulaires visuels dans le même écran.** Un composant du DS et un composant maison en Tailwind n'auront pas la même échelle d'espacement ni la même palette sans ce pont. Le symptôme n'est pas une panne, c'est une incohérence diffuse.
- Mauvais : **MUI est marqué.** Il implémente Material Design ; la thématisation change les jetons, pas la grammaire visuelle. Pour du travail multi-clients, le désapprentissage du look Material est un poste récurrent.
- Mauvais : **Mantine est le plus mal placé des trois sur cet axe précis** — culturellement le plus proche de Tailwind, mais aucune page d'intégration, aucune mention du moteur v4, et sa réponse officielle se limite à « désactivez le preflight ». Or s'en passer coûte le lissage inter-navigateurs et les styles de base des titres, listes et formulaires, à reprendre soi-même.
- Mauvais : Ant Design porte une identité visuelle très reconnaissable, et Mantine repose sur **un seul mainteneur npm**.

### B. Système de design bâti sur Tailwind

*Produits : shadcn/ui · éventuellement complété par Tailwind Plus pour le balisage et les mises en page*

- Bon : **un seul système de jetons, par construction.** shadcn définit ses jetons en propriétés personnalisées puis les expose à Tailwind par `@theme inline` — **le pont fait partie du code livré**, il n'est pas à écrire ni à maintenir. C'est l'inverse exact du principal défaut de l'approche A.
- Bon : **neutralité totale** — le code vit dans votre dépôt, donc aucune identité d'entreprise à effacer, et une identité repartable à zéro par client.
- Bon : **coût de montée de version nul sur le code copié** — il n'y a pas de dépendance runtime pour la couche visuelle. *Attention à ne pas surétendre l'argument : la primitive de bas niveau qui fournit le comportement reste, elle, une dépendance npm ordinaire, avec ses majeures.*
- Bon : **hors de portée d'un changement de licence futur.** Après l'archivage de PrimeReact en juin 2026, ce n'est pas théorique.
- Bon : le dépôt le plus vivant du panel — 67 auteurs distincts sur les cent derniers commits.
- Bon : **c'est le même socle que l'approche C**, à un niveau de préhabillage supérieur. Base UI recommande lui-même shadcn pour du prêt-à-porter.
- Neutre : la couverture est bonne mais moins large qu'une suite complète — une soixantaine d'éléments dont tableau de données et combobox, contre MUI plus MUI X.
- Neutre : Tailwind Plus se **compose** avec, il ne concurrence pas. Sa licence est la seule du champ taillée pour une agence — « unlimited End Products for unlimited Clients », 849 € une fois pour 25 personnes.
- Mauvais : **le code copié devient le vôtre, et les correctifs amont ne redescendent pas.** À dix ou vingt projets clients, c'est là qu'est le point de décision : la charge que vous vouliez externaliser revient partiellement.
- Mauvais : **la primitive sous-jacente n'est pas nommée** par la documentation. Or c'est d'elle que vient tout le comportement — clavier, focus, rôles ARIA, annonces au lecteur d'écran — donc **l'accessibilité héritée en dépend entièrement**, et elle reste une dépendance npm à monter de version. Si la primitive est Radix, on hérite aussi de son point de gouvernance : quatre auteurs distincts, et des comptes de publication sous contrôle d'une entreprise unique.
- Mauvais : **la couche interactive de Tailwind Plus est figée** — son paquet de comportement n'a rien publié depuis janvier 2026. À évaluer comme une collection de balisage, sans compter sur son interactif.

### C. Socle sans habillage, plus habillage Tailwind maison

*Produits : Base UI · react-aria-components · Ark UI*

- Bon : **la neutralité maximale**, et aucune question de cohabitation — pas de réinitialisation concurrente, pas d'ordre d'injection, pas de double jeu de jetons.
- Bon : **la meilleure accessibilité du champ, et la seule étayée.** react-aria est le seul candidat de toute l'étude à décrire un protocole de test — « extensively tested using many popular screen readers and devices » — là où les autres se contentent d'annoncer.
- Bon : **coût de montée de version quasi nul** — react-aria n'a publié aucune majeure depuis décembre 2023.
- Neutre : Base UI a changé de nom de paquet ; toute comparaison citant l'ancien est périmée.
- Mauvais : **elle rend intégralement la charge d'habillage**, c'est-à-dire précisément ce que l'agence veut externaliser. C'est le motif qui a écarté un candidat à l'axe précédent.
- Mauvais : elle ne s'amortit qu'en construisant un socle interne réutilisé — **c'est-à-dire en refaisant un framework maison.** Exactement ce que l'agence quitte.
- Mauvais : ni tableau de données, ni upload avec progression livrés.

### Briques qui se greffent sur n'importe laquelle des trois

- **La virtualisation ne justifie aucun achat** : TanStack Virtual est en MIT et publié dans le mois.
- **Le tableau de données** est le seul trou qui puisse justifier une brique payante. Six grilles commerciales sont vivantes.
- **Attention à AG Grid** : sa licence développeur **ne suffit pas** à livrer au client. Sous-licencier exige un module complémentaire distinct **dont le prix n'est pas affiché**.
- **Point aveugle de tous les contrats commerciaux lus** : aucun ne dit si les développeurs du client sont couverts **quand il reprend la maintenance**. À prévoir dans le contrat de prestation.

## Decision Outcome

**Approche B retenue : shadcn/ui sur Tailwind**, avec **TanStack Table** pour les tableaux de données.

**Ce qui a décidé, dans cet ordre :**

- **Les compétences et la préférence en place.** Plusieurs personnes de l'équipe connaissent déjà shadcn et le préfèrent à MUI. C'est le même critère qui a décidé la technologie de composants, et il vient de première main.
- **Tailwind est déjà en place sur les projets existants.** C'est la seule approche à coût d'adaptation nul : le pont entre les jetons du système de design et ceux de Tailwind **fait partie du code livré**, il n'est ni à écrire ni à maintenir. C'est le seul poste de l'approche A que personne ne facture mais que quelqu'un paie, à chaque majeure et sur chaque projet.
- **Le travail est multi-clients.** shadcn n'a aucune identité d'entreprise à effacer, là où MUI impose la grammaire visuelle de Material — que la thématisation ne change pas.
- **L'équipe n'a pas de designer dédié**, et c'est ce qui écarte l'approche C tout en rendant B viable : un socle sans habillage laisserait devant une page blanche, alors que shadcn livre des habillages de départ corrects.
- **Le besoin de tableaux est couvert gratuitement.** Le registre shadcn porte un tableau de données bâti sur TanStack Table, en MIT. Trier, filtrer et paginer ne justifie aucun achat, pas plus que la virtualisation.

**Ce qui retournerait la décision, énoncé pour qu'on le reconnaisse le jour venu :** un volume significatif d'écrans à **grille vraiment riche** — export tableur, épinglage de colonnes, regroupement, tableaux croisés. TanStack Table ne le fait pas, et le construire coûterait plus qu'une licence. **Mais l'asymétrie joue en faveur de B** : ajouter une grille riche plus tard reste un achat ciblé, alors qu'adopter MUI aujourd'hui engagerait toute la couche visuelle.

### Consequences

- **Copier par projet, et accepter la divergence.** La tentation naturelle sera de ranger les composants dans un paquet interne partagé entre projets — et **ce serait recréer la couche maison que l'agence quitte**, avec son mainteneur unique et sa dette de version. Les clients étant différents et leurs identités visuelles distinctes, un composant qui dérive légèrement entre deux projets ne coûte rien. Maintenir un socle commun que personne ne possède à plein temps, si.
- **Le code copié devient celui de l'agence**, donc les correctifs amont ne redescendent pas. C'est le prix assumé de l'approche, et il croît avec le nombre de projets.
- **Un seul système de jetons**, exposé à Tailwind par le code livré. C'est l'acquis principal, et il faut le préserver : ne pas introduire un second système de thématisation à côté.
- **Tailwind Plus se compose** si l'équipe veut du balisage et des mises en page en volume — 849 € une fois pour 25 personnes, et **la seule licence du champ explicitement taillée pour une agence**, « unlimited End Products for unlimited Clients ». À évaluer comme une collection de balisage : **sa couche interactive est figée depuis janvier 2026.**
- **Aucun achat n'est nécessaire au démarrage.** Ni pour la virtualisation, ni pour les tableaux, ni pour le socle.
- **L'accessibilité reste à auditer par projet.** Aucun candidat du champ ne publie de rapport de conformité, et le système de design ne livre pas la conformité du site — il réduit la dette structurelle.

## Confirmation

**Une vérification avant la première ligne de code, et elle prend deux minutes : quelle bibliothèque de bas niveau shadcn utilise.**

Le code que shadcn copie est une couche visuelle posée sur une bibliothèque qui fournit le comportement — navigation au clavier, gestion du focus, rôles ARIA, annonces au lecteur d'écran. Sa documentation ne la nomme pas. Il suffit d'ouvrir un composant du registre, par exemple `dialog.tsx` ou `select.tsx`, et de lire ses imports.

**Vérifié le 24 août 2026 : c'est Radix UI** (`@radix-ui/react-*`). L'accessibilité héritée vient de Radix. La gouvernance Radix est sous contrôle de WorkOS — quatre auteurs distincts, comptes de publication liés à une entreprise unique. **Une veille sur les correctifs d'accessibilité shadcn doit être en place** pour les appliquer manuellement aux projets — sans quoi « accepter la divergence » glisse vers « ignorer les correctifs ».

**Un point à instruire sur le projet public, et il n'est pas mince** : le DSFR est du CSS global avec sa propre réinitialisation et ses propres jetons. Sur ce projet, **le problème des deux systèmes de jetons revient**, cette fois entre le DSFR et Tailwind. C'est la seule cohabitation CSS réelle du dossier, et elle est circonscrite à un projet.

À douze mois : le nombre de composants réécrits par divergence entre projets — s'il explose, la décision de copier par projet était mauvaise et il faudra assumer un paquet partagé.

## More Information

Cette décision est **contrainte par** la [technologie de composants front](technologie-de-composants-front.md) : dix candidats en React, sept en Vue, quatre en Svelte.

### Décision non prise, notée pour mémoire : un DS igo en web components

**Ce serait le bon usage de Lit** — un DS livré en custom elements fonctionne dans n'importe quel hôte, et l'étanchéité du Shadow DOM y devient une qualité.

**Écarté, et pas sur la probabilité de réutilisation** : cela recréerait une couche maison **sur l'habillage**, là où la rétrospective a mesuré le péage du framework maison. La part réutilisable d'un DS est le comportement, non les tokens qui portent la marque de chaque client — et ce comportement existe déjà, maintenu par d'autres.

**Friction technique** : Tailwind est du CSS global et un shadow root ne le reçoit pas ; il faut adopter la feuille dans chaque composant, ce qui défait le modèle de Tailwind. Coût non mesuré.

**Condition sous laquelle ce choix se retourne** : le même DS servant trois projets longs ou plus, avec des écarts entre clients uniquement au niveau des tokens. Une version étroite reste envisageable sans engager de couche — quelques widgets transverses en custom elements.
