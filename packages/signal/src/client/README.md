# Igo2Component - Architecture technique

Framework réactif minimaliste basé sur Igo-Dust, avec deep réactivité et auto-tracking des dépendances.

## Vue d'ensemble

```
Props (immutable) → State (reactive) → Derived (computed) → Template → DOM
                           ↓                                            ↓
                      Proxy tracking                            DiffDOM reconciliation
```

## Fichiers

| Fichier | LOC | Responsabilité |
|---------|-----|----------------|
| `Igo2Component.js` | ~320 | Classe de base, lifecycle, render |
| `StateProxy.js` | ~80 | Deep reactivity via Proxy |
| `EventBinder.js` | ~110 | Gestion optimisée des événements |
| `DerivedCache.js` | ~65 | Memoization des getters |
| `FormHandler.js` | ~125 | Two-way binding des formulaires |

---

## StateProxy.js

Wraps le state dans un Proxy récursif pour détecter les mutations à n'importe quelle profondeur.

### Fonctionnement

1. Chaque objet/array est wrappé dans un Proxy
2. Le trap `set` intercepte les mutations et appelle `_triggerRender()`
3. Les méthodes d'array (push, pop, splice, etc.) sont wrappées
4. Un WeakMap évite le double-wrapping

### Code clé

```javascript
const handler = {
  set(target, property, value) {
    target[property] = wrap(value);  // Wrap récursif
    component._triggerRender();       // Déclenche le render
    return true;
  }
};
```

### Mutations supportées

```javascript
this.state.count = 5;                    // Niveau 1
this.state.user.name = 'John';           // Niveau 2
this.state.user.address.city = 'Paris';  // Niveau 3+
this.state.items.push({ id: 1 });        // Array methods
this.state.items[0].name = 'Updated';    // Array item mutation
```

---

## DerivedCache.js

Memoization des getters avec tracking automatique des dépendances.

### Fonctionnement

1. Au premier appel d'un getter, `_isTracking = true`
2. Chaque accès à `this.props.x` ou `this.state.y` est enregistré
3. Le résultat est mis en cache avec ses dépendances
4. Aux renders suivants, recalcul uniquement si les dépendances ont changé

### Code clé

```javascript
memoize(key, fn, deps, context, currentValue) {
  const cached = this._cache.get(key);

  if (cached && !this._depsChanged(cached.deps, deps, context)) {
    return cached.value;  // Cache hit
  }

  this._cache.set(key, { value: currentValue, deps });
  return currentValue;
}
```

---

## EventBinder.js

Gestion optimisée des événements avec WeakMap.

### Fonctionnement

1. `WeakMap<Element, Map<eventType, handler>>` stocke les listeners
2. Au render, vérifie si le listener existe déjà
3. Si l'élément est préservé par DiffDOM, le listener est réutilisé
4. Si l'élément est remplacé, nouveau listener créé
5. Les éléments supprimés sont garbage collectés automatiquement

### Performance

- O(1) lookup pour vérifier si un listener existe
- Pas de rebinding si l'élément n'a pas changé
- Pas de memory leaks grâce à WeakMap

---

## FormHandler.js

Synchronisation automatique des champs de formulaire avec `this.state.form`.

### Activation

Le FormHandler s'active si `this.props.form` existe dans le constructeur.

### Fonctionnement

1. `initForm()` : Copie les valeurs initiales dans un objet partagé (`window.__igo2_form`)
2. `bind()` : Attache les listeners sur les inputs
3. `handleInput()` : Met à jour `this.state.form` à chaque changement

### Valeurs toujours stockées comme strings

Les valeurs du formulaire sont **toujours stockées comme strings** (sauf checkboxes → boolean).
Cela garantit la cohérence entre le SSR (où `req.query` retourne des strings) et le client.

**Les getters doivent convertir explicitement les types quand nécessaire :**

```javascript
get selected_product() {
  const productId = Number(this.state.form?.product_id);
  return this.props.products?.find(p => p.id === productId);
}
```

### Types supportés

| Attribut | Valeur stockée |
|----------|----------------|
| `type="text"` | String |
| `type="number"` | String (convertir avec `Number()` si besoin) |
| `type="checkbox"` | Boolean ou Array de strings |
| `name="x[]"` | Array de strings |
| `name="x[0][]"` | Nested array de strings |

---

## Igo2Component.js

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

Les renders sont synchronisés avec le browser paint :

```javascript
_triggerRender() {
  if (this._renderFrame) {
    cancelAnimationFrame(this._renderFrame);
  }
  this._renderFrame = requestAnimationFrame(() => this.render());
}
```

### Props hydration

Les props locales sont désérialisées avec `devalue` :

```javascript
if (this.element.dataset.props) {
  const hydrate = new Function('return ' + this.element.dataset.props);
  localProps = hydrate();
}
this._props = { ...globalProps, ...localProps };
```

### Child components

Les composants enfants sont :
1. Préservés par DiffDOM (leurs attributes peuvent être mis à jour)
2. Montés automatiquement après le render parent
3. Synchronisés via `_syncChildProps()` quand leurs data-props changent

### Cleanup

```javascript
async destroy() {
  cancelAnimationFrame(this._renderFrame);
  this._eventBinder.unbind();
  this._formHandler?.unbind();
  this._derivedCache.clear();
  this.element.__signalInstance = null;
  // ... null toutes les références
}
```

---

## DiffDOM

Bibliothèque externe pour la réconciliation DOM.

### Usage

```javascript
const diff = diffDom.diff(this.element, newElement);
diffDom.apply(this.element, filteredDiff);
```

### Filtrage des child components

Les diffs touchant des composants enfants sont filtrés pour préserver leur état :

```javascript
const filteredDiff = diff.filter(d => {
  // Toujours autoriser les modifications d'attributs (data-props sync)
  if (d.action === 'modifyAttribute') return true;

  // Filtrer les diffs qui touchent des [data-component]
  // ...
});
```

---

## Templates Dust

Les templates reçoivent un contexte fusionné :

```javascript
const context = {
  ...this._props,           // Props serveur
  ...this._state,           // State réactif
  ...this._derivedValues    // Getters calculés
};
```

### Helpers disponibles

- `{@json value=x /}` : Sérialise en JSON
- `{@devalue value=x /}` : Sérialise avec devalue (préserve les types)
- `{@selected key=a value=b /}` : Attribut selected conditionnel
- `{@disabled key=a value=b /}` : Attribut disabled conditionnel
