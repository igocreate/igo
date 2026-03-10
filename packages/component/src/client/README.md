# @igojs/component - Architecture interne (client)

Framework reactif base sur Igo-Dust, avec deep reactivite et auto-tracking des dependances.

## Vue d'ensemble

```
Props (immutable) → State (reactive) → Derived (computed) → Template → DOM
                          ↓                                           ↓
                    Proxy tracking                         DiffDOM reconciliation
```

## Fichiers

| Fichier | Responsabilite |
|---------|----------------|
| `IgoComponent.js` | Classe de base IgoComponent, lifecycle, render |
| `ComponentLoader.js` | Chargement auto des SFC depuis le serveur |
| `StateProxy.js` | Deep reactivity via Proxy |
| `EventBinder.js` | Gestion optimisee des evenements |
| `DerivedCache.js` | Memoization des getters |
| `FormHandler.js` | Two-way binding des formulaires |

---

## StateProxy.js

Wraps le state dans un Proxy recursif pour detecter les mutations a n'importe quelle profondeur.

### Fonctionnement

1. Chaque objet/array est wrappe dans un Proxy
2. Le trap `set` intercepte les mutations et appelle `_triggerRender()`
3. Les methodes d'array (push, pop, splice, etc.) sont wrappees
4. Un WeakMap evite le double-wrapping

### Mutations supportees

```javascript
this.state.count = 5;                    // Niveau 1
this.state.user.name = 'John';           // Niveau 2
this.state.user.address.city = 'Paris';  // Niveau 3+
this.state.items.push({ id: 1 });        // Array methods
this.state.items[0].name = 'Updated';    // Array item mutation
```

---

## DerivedCache.js

Memoization des getters avec tracking automatique des dependances.

### Fonctionnement

1. Au premier appel d'un getter, `_isTracking = true`
2. Chaque acces a `this.props.x` ou `this.state.y` est enregistre
3. Le resultat est mis en cache avec ses dependances
4. Aux renders suivants, recalcul uniquement si les dependances ont change

---

## EventBinder.js

Gestion optimisee des evenements avec WeakMap.

### Fonctionnement

1. `WeakMap<Element, Map<eventType, handler>>` stocke les listeners
2. Au render, verifie si le listener existe deja
3. Si l'element est preserve par DiffDOM, le listener est reutilise
4. Si l'element est remplace, nouveau listener cree
5. Les elements supprimes sont garbage collectes automatiquement
6. Supporte `selector: 'document'` et `selector: 'window'`

---

## FormHandler.js

Synchronisation automatique des champs de formulaire avec `this.state.form`.

### Activation

Le FormHandler s'active si `this.props.form` existe dans le constructeur.

### Types supportes

| Input | Valeur stockee |
|-------|----------------|
| `type="text"`, `textarea` | String |
| `type="number"` | String (convertir avec `Number()`) |
| `type="checkbox"` | Boolean ou Array (`name="x[]"`) |
| `name="x[0][]"` | Nested array de strings |
| `select` | String |
| `select[multiple]` | Array de strings |

---

## ComponentLoader.js

Chargement automatique des composants single-file.

### Fonctionnement

1. `load(name)` → fetch `GET /__component/component?name=<name>`
2. Evalue le `<script>` block pour obtenir la definition
3. `buildClass()` cree une sous-classe de IgoComponent
4. Copie methodes et getters de la definition sur le prototype
5. Cache les promises pour eviter les requetes dupliquees

---

## IgoComponent (IgoComponent.js)

Classe de base orchestrant tous les modules.

### Lifecycle

```
constructor()
    ↓
init()
    ↓
loadTemplate()
    ↓
render() ←──────────────┐
    ↓                   │
beforeRender()          │
    ↓                   │
_computeGettersAsDerived()
    ↓                   │
dust.render()           │
    ↓                   │
DiffDOM.apply()         │
    ↓                   │
_syncChildProps()       │
    ↓                   │
_bindEvents()           │
    ↓                   │
_mountChildComponents() │
    ↓                   │
afterRender()           │
    ↓                   │
[state mutation] ───────┘
```

### Render optimization

Les renders sont debounces via `requestAnimationFrame`.

### Child components

1. Preserves par DiffDOM (seuls les attributs peuvent etre modifies)
2. Montes automatiquement apres le render parent
3. Synchronises via `_syncChildProps()` quand leurs `data-props` changent
4. Seuls les composants top-level sont montes au demarrage (pas les enfants)
