# Observabilité front

**Statut** : proposé  
**Date** : 2026-08-24

## Context and Problem Statement

Le front des applications igo passe d'un rendu serveur (dust + jQuery) à des SPA React servies en assets statiques. Ce changement déplace les erreurs : elles ne se produisent plus dans le process Node — visible par pm2, loggé, qui envoie un mail — mais **dans le navigateur de l'utilisateur**, invisible du serveur.

Aujourd'hui, le système de surveillance côté serveur (exception → crash → redémarrage pm2 → mail) a fait ses preuves. Mais côté client, **il n'y a rien** : un écran blanc, un bouton qui ne fait rien, une requête qui tourne dans le vide — personne n'est au courant.

L'ADR technologie a pondéré la détection de problèmes et l'observabilité à **4**. Le cadre de décision note un « public mobile dominant en outre-mer, connectivité contrainte, terminaux anciens » et « **aucun analytics : pas de photo T0** ».

## Périmètre

Deux axes, par ordre de priorité :

1. **Les erreurs** — ce qui plante côté client. C'est le filet de sécurité manquant. Concerne tous les projets.
2. **La performance web** — Web Vitals sur les sites grand public uniquement (espace bénéficiaire de ladom). Pas sur les back-offices internes.

**Hors périmètre** : l'analytics d'usage (pages vues, entonnoirs, actions métier). C'est un sujet produit, pas un sujet d'architecture front.

## Considered Options

### Capture des erreurs

Trois options, de la plus riche à la plus simple :

**A. Sentry** (SaaS, plan Team ~26 $/mois/utilisateur, 2-3 comptes suffisent)

- Bon : source maps résolues automatiquement — le stack trace pointe le code source, pas le bundle minifié.
- Bon : déduplication automatique — 50 utilisateurs sur le même bug produisent **une** entrée, pas 50 alertes.
- Bon : breadcrumbs — les 20 dernières actions de l'utilisateur avant le crash, sans code à écrire.
- Bon : Web Vitals intégrés, dashboards, suivi par release, alertes configurables.
- Mauvais : coût récurrent (~50-75 $/mois pour 2-3 utilisateurs).
- Mauvais : dépendance à un service tiers.

**B. Front → `POST /api/errors` → mail**

- Bon : gratuit, sans dépendance tierce.
- Bon : cohérent avec le système crash → mail existant côté serveur.
- Mauvais : stack minifiée — difficile à exploiter sans résolution de source maps.
- Mauvais : pas de déduplication — un mail par occurrence, sauf à la construire.
- Mauvais : pas de breadcrumbs, pas de dashboards, pas de Web Vitals.

**C. Ne rien faire**

- Écarté : le front est aujourd'hui **invisible en production**. C'est le statu quo, et c'est exactement le problème que cet ADR résout.

| | Sentry | Front → mail |
|---|---|---|
| Coût | ~50-75 $/mois (2-3 utilisateurs, plan Team). Free tier : 5K erreurs/mois, 1 utilisateur | 0 € |
| Mise en place | `Sentry.init()` — une heure | Un endpoint igo + formatage mail — une demi-journée |
| Source maps | Résolues automatiquement | Stack minifiée, difficile à exploiter |
| Déduplication | Automatique | À construire, sinon un mail par occurrence |
| Breadcrumbs | Automatiques | Non, sauf envoi explicite |
| Web Vitals | Intégrés (performance monitoring) | Non |
| Alertes | Configurables par seuil, slack, mail | Un mail par erreur (ou par lot, à construire) |
| Dashboards | Issues groupées, performance par page/navigateur/géo, suivi par release | Non — les mails forment une file non triée |

### Error boundary

**A. Racine seul** — un Error Boundary unique à la racine de l'application, page d'erreur générique.

- Bon : simple, un seul composant, aucune configuration par route.
- Bon : suffisant — les Error Boundaries React n'attrapent que les crashs de rendu, pas les erreurs réseau ni les event handlers. Les erreurs réseau (95 % des cas) passent par TanStack Query et sont gérées section par section.
- Mauvais : un crash de rendu dans une route remplace toute l'application, navigation comprise.

**B. Par route + racine** — un boundary par route qui préserve la navigation, plus un boundary racine en filet.

- Bon : la navigation survit à un crash de rendu dans une route.
- Mauvais : complexité marginale pour un cas rare (un crash de rendu dans du code TypeScript bien typé).

### Web Vitals

**A. Sur tous les projets**

- Écarté : les back-offices internes n'ont pas d'enjeu de performance — utilisateurs sur réseau local ou bon débit, terminaux récents. Mesurer les Web Vitals y ajouterait du bruit sans valeur.

**B. Sites grand public uniquement** (espace bénéficiaire de ladom)

- Retenu : c'est là que le public est contraint (outre-mer, mobile, terminaux datés) et qu'il n'y a **aucune mesure aujourd'hui**.

## Decision Outcome

### Capture des erreurs — Sentry recommandé, front → mail en alternative

**Sentry** est recommandé pour les source maps et la déduplication, qui manquent à l'option mail et sont difficiles à construire. Le volume d'erreurs tranchera : tant qu'il y a 2-3 erreurs par semaine, le mail suffit ; dès qu'il y a un pic, Sentry devient indispensable.

**Dans les deux cas**, le code applicatif utilise une seule fonction `reportError()` dans `lib/`. Remplacer l'implémentation mail par le SDK Sentry ne touche qu'un fichier.

### Gestion des erreurs dans les composants

Les erreurs visibles au quotidien ne sont pas des crashs de rendu — ce sont des **erreurs réseau** et des **états de chargement**. TanStack Query expose `error` et `isLoading` sur chaque query.

**Règle : chaque section qui appelle `useQuery` gère explicitement ses trois états — chargement, erreur, données.**

```tsx
function CommentairesSection({ dispositifId }: Props) {
  const { data, error, isLoading } = useCommentaires(dispositifId)

  if (isLoading) return <Skeleton />
  if (error) return <ErreurSection message="Impossible de charger les commentaires" />
  return <CommentairesList commentaires={data} />
}
```

Pas de `data!` sans vérification, pas de section qui reste vide silencieusement quand la requête échoue. Le composant `<ErreurSection>` est partagé dans `components/` — un message, un bouton réessayer optionnel.

### Error Boundary — racine seul

**Option A retenue.** Un Error Boundary racine redirige vers une page d'erreur générique. Le boundary par route (option B) est un raffinement possible mais non structurant — les crashs de rendu sont rares dans du code TypeScript bien typé, et le vrai travail d'observabilité au quotidien est la gestion des états TanStack Query, pas les Error Boundaries.

### Web Vitals — sites grand public uniquement

**Avec Sentry** : le performance monitoring est activé dans le SDK, les métriques (LCP, CLS, INP) apparaissent dans le dashboard Performance, filtrables par page, navigateur, géographie. Pas de bibliothèque supplémentaire.

**Sans Sentry** : la bibliothèque `web-vitals` (1,5 Ko) envoie les métriques sur un `POST /api/vitals`. L'exploitation est rudimentaire, mais la photo T0 est prise.

### Ce que le système existant continue de couvrir

Le crash → mail côté serveur reste en place, inchangé. L'observabilité front s'**ajoute** au système existant, elle ne le remplace pas.

| | Serveur (existant) | Front (nouveau) |
|---|---|---|
| Où l'erreur se produit | Process Node (igo) | Navigateur de l'utilisateur |
| Détection | pm2 voit le crash | SDK ou `POST /api/errors` |
| Alerte | Mail | Sentry ou mail |
| Diagnostic | Log serveur, stack trace | Source maps (Sentry) ou stack minifiée (mail) |

## Consequences

- Bon : **le front passe de zéro visibilité à un filet de sécurité réel.** Aujourd'hui un écran blanc chez un utilisateur est invisible — demain il remonte.
- Bon : **la photo T0 de performance existe** sur les projets grand public, là où le diagnostic ladom notait « aucun analytics ».
- Bon : **la gestion systématique des états loading/error/data dans les sections** donne à l'utilisateur un retour explicite au lieu d'un silence.
- Bon : **le code est découplé de l'outil** — une fonction `reportError()` unique, remplaçable de mail vers Sentry sans toucher les composants.
- Neutre : **le système crash → mail côté serveur reste inchangé.** L'observabilité front est une couche en plus, pas une refonte.
- Mauvais : **Sentry est un coût récurrent**, même modeste. L'alternative mail est gratuite mais plus pauvre.
- Mauvais : **sans Sentry, les source maps ne sont pas résolues.** Un stack trace minifié en production est difficile à exploiter.
- Mauvais : **les breadcrumbs ne sont disponibles qu'avec Sentry.** Sans eux, reproduire le chemin qui mène à un bug dépend du rapport de l'utilisateur.

## Confirmation

Comment on saura, dans six mois, si l'observabilité fonctionne :

- **Temps moyen entre l'apparition d'un bug front et sa détection** — aujourd'hui infini (personne n'est au courant). L'objectif est qu'il tombe sous 24h.
- **Proportion de bugs front découverts par l'outil vs par un utilisateur qui appelle** — l'outil doit trouver les bugs avant les utilisateurs.
- **Existence d'une photo T0 de Web Vitals sur ladom** — mesurée ou non.
- **Nombre de mails d'erreur non dédupliqués par semaine** (si option mail) — si le volume rend les mails illisibles, c'est le signal pour passer à Sentry.

## More Information

Cette décision complète la chaîne de fiabilité posée par l'[architecture front de référence](architecture-front-de-reference.md) et la [stratégie de test](strategie-de-test-front.md). Les tests attrapent les bugs avant la production ; l'observabilité attrape ceux qui passent.

L'[organisation des sources](organisation-des-sources-front.md) structure la gestion des erreurs : les sections gèrent les états TanStack Query, les composants purs ne gèrent rien — ils reçoivent des données ou ne sont pas rendus. Le boundary racine est le dernier filet.
