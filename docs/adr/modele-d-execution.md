# Modèle d'exécution

**Statut** : **accepté** — cible ; aucun projet n'y tourne encore
**Date** : 2026-09-18, révisé le 2026-11-26
**Portée** : nouveaux projets sans besoin de puissance dédiée. Le parc existant s'en approche par l'empaquetage, qui en est le préalable.

## Context and Problem Statement

L'application, une fois empaquetée en image, doit s'exécuter quelque part — sur une infrastructure que l'agence administre, ou sur une plateforme qui l'exploite pour elle.

Les applications de l'agence sont des applications web qui doivent rester disponibles en permanence : **deux instances actives au minimum en production**, quel que soit le modèle retenu. En production, la charge varie fortement sur la journée et sur la semaine sans jamais s'annuler — l'extinction complète n'y est donc jamais possible.

**Les environnements hors production sont dans le cas inverse.** Chaque projet en compte plusieurs, sur des machines dédiées, qui ne servent qu'aux heures ouvrées et sont pourtant payés en permanence.

Trois éléments motivent la question au-delà de l'empaquetage :

- **Aucun produit de l'agence ne dispose aujourd'hui d'élasticité.** La capacité est dimensionnée pour le pic et payée en continu, en production comme hors production.
- **Les tâches planifiées s'exécutent dans le processus applicatif.** Une tâche consommatrice prend ses ressources au trafic web, et les deux ne peuvent pas être dimensionnés séparément.
- **Le temps de mise en place compte autant que le coût d'exploitation.** Une agence qui démarre des projets met en service des environnements régulièrement.

**Sur quel modèle d'exécution l'agence déploie-t-elle ses applications ?**

## Decision Drivers

- **Le coût complet** — la facture d'infrastructure et le temps humain de mise en place et d'exploitation, qui se substituent l'un à l'autre.
- **La charge d'exploitation** — ce qui reste à administrer, et les échéances récurrentes que cela crée.
- **Le délai de mise en service** — le temps nécessaire pour ouvrir un environnement, initialement et ensuite.
- **L'élasticité** — la capacité à suivre la charge plutôt qu'à payer le pic en continu, y compris jusqu'à l'extinction hors production.
- **La séparation des profils d'exécution** — le service web et les tâches planifiées n'ont ni le même rythme ni les mêmes besoins.
- **La disponibilité** — deux instances actives au minimum, en permanence.

## Considered Options

1. **Machine administrée par l'agence** — instances ou serveurs physiques, moteur de conteneurs installé dessus.
2. **Kubernetes managé** — cluster mutualisé entre les projets de l'agence.
3. **Conteneurs managés par le fournisseur** — Serverless Containers et Serverless Jobs.

## Decision Outcome

**Option 3 pour le service web et les tâches planifiées, sur les projets sans besoin de puissance dédiée.**

### Ce que coûte chaque option en production

| | Infrastructure | Mise en place | Ce qui reste à administrer |
|---|---:|---|---|
| Machine administrée | **149 €** | Moteur de conteneurs sur chaque hôte, reprise des recettes de déploiement | Hôtes, redémarrages, correctifs système |
| Kubernetes managé | **215 €** | Cluster, puis ingress, certificats, droits, supervision, manifests | Tout ce qui précède, plus une **montée de version tous les 9 à 14 mois** |
| Conteneurs managés | **373 €** | Pousser une image, déclarer le service | Rien au-delà de l'image |

*Base de calcul : deux instances d'un gabarit intermédiaire maintenues en permanence, tarifs catalogue français au 18 septembre 2026. Les montants varient avec le gabarit ; les rapports entre modèles, beaucoup moins.*

L'écart entre la machine administrée et les conteneurs managés est de **224 € par mois**. Rapporté au coût d'une journée d'ingénieur, **il correspond à moins d'une demi-journée mensuelle d'exploitation**. Le modèle le plus cher à la facture est donc le moins cher dès que l'exploitation dépasse ce seuil — ce qui est le cas dès qu'un incident, une montée de version ou un correctif urgent survient dans le mois.

**Ce raisonnement ne vaut que parce que le parc est petit.** Il s'inverserait avec un nombre de projets suffisant pour amortir une plateforme mutualisée.

La colonne « mise en place » est le second écart, et il ne s'amortit pas : il se répète à chaque nouveau projet et à chaque nouvel environnement. Sur Kubernetes, ce n'est pas le cluster qui prend du temps — c'est tout ce qu'il faut monter autour avant qu'une application y soit servie.

### Ce que l'élasticité change

Un conteneur managé est facturé à la seconde consommée. En production, réduire le nombre d'instances aux heures creuses abaisse le coût d'environ un quart — au prix d'une disponibilité dégradée pendant ces heures, ce qui relève du niveau de service vendu et se décide projet par projet.

**Le gain décisif est hors production.** Des environnements qui ne servent qu'aux heures ouvrées et s'éteignent complètement le reste du temps ne sont plus payés que pour ce qu'ils consomment — de l'ordre du quart d'un mois complet. Comme ces environnements sont sur des machines dédiées et qu'ils sont plusieurs par projet, **c'est le poste où l'économie est la plus directe**, et il est hors d'atteinte des deux autres modèles : une machine éteinte reste facturée, un nœud de cluster aussi.

Kubernetes offre également l'élasticité en production : les pools de nœuds s'ajustent automatiquement entre des bornes, et les nœuds inutiles sont retirés. Le grain est le nœud et le délai se compte en minutes, ce qui suffit à un profil de charge qui varie sur la journée et sur la semaine. **L'élasticité en production n'est donc pas ce qui départage les options 2 et 3** — seule l'option 1 en est dépourvue, et seule l'option 3 descend à zéro.

### Les tâches planifiées

C'est là que l'écart est le plus net. Des tâches périodiques de courte durée, exécutées quelques fois par jour, **restent sous le palier gratuit** du modèle à la seconde. Une tâche fréquente, exécutée à la minute, se chiffre en quelques euros par mois.

Chaque tâche devient un conteneur éphémère lancé sur l'image applicative, avec ses propres ressources et sans serveur HTTP. Elle cesse de concurrencer le trafic web, et son échec devient observable par son code de sortie.

**Les tâches planifiées justifient à elles seules de sortir du modèle « tout dans un processus »**, quel que soit le modèle retenu pour le service web.

### Ce qui conditionne l'applicabilité

La décision suppose un service web sans état local : sessions non portées par le serveur, aucune écriture persistante sur le disque de l'instance, et un verrou partagé pour les tâches qui ne doivent pas s'exécuter en double. **Un projet qui ne remplit pas ces conditions se décide séparément**, et les traiter est un préalable, pas une conséquence.

### Ce qui reste sur machine administrée

Les projets dont le besoin de puissance justifie des cœurs dédiés, ou dont le budget impose le socle le moins cher. La décision ne les convertit pas : elle fixe le défaut des nouveaux projets.

### Ce qui doit être vérifié avant la première mise en production

Le verrou de concurrence des tâches planifiées existe déjà et fonctionne. Les sessions ne sont pas portées par le serveur. ~~**Mais l'arrêt propre du serveur HTTP n'est pas traité**~~ — **livré dans `@igojs/server` 6.4.0** et éprouvé sur ladom en conteneur : la condition bloquante est levée pour tout projet igo (voir [Empaquetage](empaquetage-de-l-application.md), *Confirmation*).

Reste alors propre au modèle managé, et non vérifié : les limites de la plateforme (durée maximale d'une requête, plafond d'instances) et le coût réel sur un mois complet.

## Pros and Cons of the Options

### Option 1 — machine administrée

- Bon, parce que c'est la facture la plus basse et le modèle que l'équipe maîtrise déjà.
- Bon, parce qu'elle autorise les cœurs dédiés, là où la puissance brute compte.
- **Mauvais, parce qu'elle n'offre aucune élasticité** : la capacité de pointe est payée en continu, en production comme sur des environnements hors production qui ne servent qu'aux heures ouvrées.
- Mauvais, parce qu'elle impose d'installer et de maintenir un moteur de conteneurs sur chaque hôte, à chaque nouvel environnement.
- Mauvais, parce que les tâches planifiées restent dans le processus applicatif, sans dimensionnement propre.

### Option 2 — Kubernetes managé

- Bon, parce que le plan de contrôle est gratuit ou peu coûteux, et que les nœuds s'ajustent automatiquement.
- Bon, parce qu'il traite les deux profils d'exécution : services longs et tâches ponctuelles, avec des pools distincts.
- Bon, parce qu'il apporte l'auto-réparation et les déploiements progressifs.
- Neutre, parce que la plateforme est mutualisable entre projets — son coût s'amortit d'autant plus que le parc est grand.
- **Mauvais, parce qu'il crée une échéance récurrente qui n'existe pas aujourd'hui** : les montées de version mineures sont manuelles, et la fenêtre de support est de neuf à quatorze mois selon le fournisseur. Sur un parc où les correctifs système sont déjà rarement appliqués, c'est une obligation nouvelle.
- Mauvais, parce que l'ingress, les certificats, les droits, la supervision et les sauvegardes restent intégralement à la charge de l'agence — c'est la part longue de la mise en place, pas le cluster.
- Mauvais, parce qu'un nœud reste facturé même inutilisé : les environnements hors production ne peuvent pas descendre à zéro.
- Mauvais, parce qu'il suppose une compétence à acquérir et à entretenir dans une équipe qui ne l'exploite pas aujourd'hui pour son propre compte.

### Option 3 — conteneurs managés

- Bon, parce qu'**il n'y a ni machine ni cluster à administrer** : l'unité livrée est l'image, et rien en dessous.
- Bon, parce que la facturation à la seconde rend l'élasticité réelle, sans capacité à provisionner d'avance.
- Bon, parce que **les environnements hors production s'éteignent quand personne ne s'en sert**, et ne sont facturés que pour les heures ouvrées.
- Bon, parce que la mise en service d'un environnement se réduit à pousser une image — ce qui se répète à chaque projet.
- Bon, parce que les tâches planifiées y sont quasiment gratuites et s'exécutent isolément du service web.
- Bon, parce qu'il n'engage sur aucune montée de version d'infrastructure.
- **Mauvais, parce que c'est la facture la plus élevée** — deux fois et demie celle d'une machine administrée sur une charge permanente.
- Mauvais, parce que le modèle impose ses limites : durée maximale par requête, plafond d'instances simultanées, architecture d'image imposée.
- Mauvais, parce qu'il lie l'exécution à un fournisseur dont l'offre équivalente n'existe pas partout — l'image reste portable, pas la plateforme.

## Consequences

- **Bon : les tâches planifiées cessent de concurrencer le trafic web.** Elles deviennent dimensionnables séparément, et leur échec devient observable.
- **Bon : l'élasticité devient disponible sans capacité à provisionner.** C'est le premier produit de l'agence dans ce cas.

- **Neutre : l'image applicative reste portable.** Ce qui est lié au fournisseur est la plateforme d'exécution, pas l'artefact. Un changement de modèle ne redemande pas de réempaqueter.
- **Neutre : le niveau de service détermine le plancher.** Deux instances en permanence est un choix de disponibilité, pas une contrainte technique ; le réduire la nuit relève de ce qui est vendu.

- **Mauvais : l'arrêt propre du serveur HTTP doit être traité avant la première mise en production.** Sans cela, chaque redéploiement et chaque réduction d'échelle coupe les requêtes en cours.
- **Mauvais : le coût croît avec l'usage, sans plafond.** Une facture à la seconde suit la charge dans les deux sens ; une dérive applicative se paie immédiatement, là où une machine absorbe silencieusement.
- **Mauvais : la décision suppose un fournisseur qui propose ce modèle.** Elle restreint le choix d'hébergeur pour les projets concernés.

## Confirmation

1. ~~**Traiter l'arrêt propre du serveur HTTP**~~ — levé : `@igojs/server` 6.4.0, éprouvé en conteneur sur ladom.
2. **Vérifier que la charge tient dans les limites du modèle** : durée maximale d'une requête, plafond d'instances simultanées, et le cas de la tâche dense qui s'exécute à la minute. **Point d'attention relevé depuis** : un projet qui génère des PDF embarque un navigateur, d'où une image de l'ordre de 3 Go — à confronter aux limites de taille d'image et au temps de démarrage à froid de la plateforme, qui conditionnent l'éligibilité d'un tel projet.
3. **Mesurer le coût réel sur un premier projet** pendant un mois complet, et le comparer à l'estimation ci-dessus. Les tarifs catalogue ne portent ni remise ni engagement. **Commencer par un environnement hors production** : le gain y est le plus net et le risque nul.
4. **Établir si une instance maintenue active est facturée pendant son inactivité** — la documentation publique ne le dit pas, et cela détermine le coût du plancher de disponibilité.

## More Information

Les mesures qui établissent l'absence de plage d'extinction et le profil des tâches planifiées, les tarifs et les modalités d'élasticité relevés chez les deux fournisseurs français, ainsi que la comparaison avec Kubernetes managé, sont dans l'étude d'empaquetage et d'hébergement (septembre 2026), dont cet ADR est issu. Les montants y sont des tarifs catalogue au 18/09/2026.

L'agence exploite déjà un déploiement conteneurisé orchestré sur un autre projet (comparaison funecap, dans la même étude). Deux enseignements en sont tirés : le motif d'une seule image portant plusieurs points d'entrée, qui dispense d'exposer les tâches planifiées derrière une route HTTP privilégiée ; et le fait que la séparation des responsabilités y repose sur un infogérant tiers, que l'agence n'aurait pas en exploitant elle-même une plateforme équivalente.
