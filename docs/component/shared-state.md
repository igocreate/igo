
# Shared state — `this.store`

`state` is local to a component. `props` flow parent → child. When two components on the same page need to talk laterally — parent ↔ siblings, siblings ↔ siblings, or anything outside the immediate parent chain — use `this.store`.

`this.store` is a **page-level reactive Proxy**. Every component sees the same instance. Reads auto-subscribe the component to that key, writes re-render all subscribers and fire matching watchers.

```js
this.store.client  = { id: 42, name: 'Bob' };  // write — all subscribers re-render
const c = this.store.client;                   // read — this component subscribes to 'client'
```

No declaration, no opt-in, no naming. It's there.

## Template access

The template context is flat: store keys sit alongside `state`, `props`, and getters at the top level. No `store.` prefix needed.

```dust
{?client}{client.name}{:else}Choisir un client…{/client}
```

## When to use store vs state vs props

| Scope         | Lives where                       | Use for                                |
|---------------|-----------------------------------|----------------------------------------|
| `this.props`  | Set by the parent on each render  | One-way data flow parent → child       |
| `this.state`  | Inside one component instance     | Local UI state (open/closed, dirty…)   |
| `this.store`  | Page-global, shared by all mounts | Cross-component data and signals       |

## Bootstrapping initial values

SSR doesn't populate the store, but you often need initial state to be present before the first client-side render — restoring a form after a validation error, hydrating a list, etc.

Pattern: the controller passes the initial value via **props**, and the component seeds the store once in `init()` — the lifecycle hook that runs a single time, before the first render:

```js
({
  init() {
    if (this.props.client) {
      this.store.client = this.props.client;
    }
  },
})
```

`init()` runs once after `props`/`state`/`store` are ready and before the first **client** render, so no manual guard flag is needed to avoid re-seeding.

`init()` is **client-only** — it never runs during SSR (the server has no store; see the gotchas). So the seed lands on hydration, not in the server HTML: the first server paint shows the un-seeded branch (`{:else}…`) until the client mounts and re-renders. That's why **props are the SSR delivery channel** and the store becomes the runtime source of truth: to avoid a flash, the template reads the value from props for the SSR-visible part, and the store takes over once the page is live. After seeding, watchers fire normally and other components on the page see the value.

If a watcher on the seeded key cascades fetches (e.g. enriching from the server), design it with the standard recursion guard — see the gotchas below.

## Worked example: client/trainee/modal

A registration form has two picker children (`ClientPicker`, `TraineePicker`) and a sibling modal (`ClientInfoModal`) that lives outside the form. Picking a client must reload the trainee list; clicking a button in the form must open the modal.

```dust
{! views/home/index.dust !}
<div class="page">
  {@component "components/RegistrationForm" clients /}
  {@component "components/ClientInfoModal" /}
</div>
```

### Parent — composes the children

`RegistrationForm` mounts the two pickers, passes `clients` down to `ClientPicker`, and owns the button that opens the modal. `TraineePicker` takes no props — it talks to the store directly.

```dust
{! views/components/RegistrationForm.dust !}
<script>
({
  openClientInfo() {
    if (this.store.client) {
      this.store.modal = 'client-info';
    }
  },
})
</script>

<form class="registration">
  {@component "components/ClientPicker"  clients /}
  {@component "components/TraineePicker" /}

  <button on:click="openClientInfo" {^client}disabled{/client}>Voir la fiche client</button>
</form>
```

`clients` is the only thing that flows down as a prop; everything cross-component (`client`, `trainees`, `trainee`, `modal`) goes through the store. Note the parent never wires the pickers to each other — they coordinate entirely through store keys.

### Child A — writes the store

```dust
{! views/components/ClientPicker.dust !}
<script>
({
  state: { open: false },

  pick(e) {
    const id          = parseInt(e.currentTarget.dataset.id, 10);
    this.store.client = this.props.clients.find(c => c.id === id);
    this.state.open   = false;
  },
})
</script>

<div class="picker">
  <div class="trigger" on:click="toggle">
    {?client}{client.name}{:else}Choisir un client…{/client}
  </div>
  …
</div>
```

`ClientPicker`'s only job is to write `store.client`. It doesn't clear the trainee, fetch a list, or even know that `TraineePicker` exists — the consequences of a client change belong to whoever owns that data, not to the picker that triggered it.

### Child B — reads the store

```dust
{! views/components/TraineePicker.dust !}
<script>
({
  state: { open: false },

  watch: {
    // client changed — from any source: a pick, the init() seed, anything.
    // TraineePicker owns the trainee list, so it reloads it here.
    async client(client) {
      this.store.trainee  = null;
      this.store.trainees = null;
      if (!client) {
        return;
      }
      const res           = await fetch(`/json/clients/${client.id}/trainees`);
      this.store.trainees = await res.json();
    },
  },

  pick(e) {
    const id           = parseInt(e.currentTarget.dataset.id, 10);
    this.store.trainee = this.store.trainees.find(t => t.id === id);
    this.state.open    = false;
  },
})
</script>

<div class="picker">
  <div class="trigger" on:click="toggle">
    {?trainee}{trainee.first_name} {trainee.last_name}{:else}Choisir un stagiaire…{/trainee}
  </div>
  {?open}
    {?trainees}
      {#trainees}<div class="item" data-id="{.id}" on:click="pick">{.first_name} {.last_name}</div>{/trainees}
    {:else}
      <div class="empty">Chargement…</div>
    {/trainees}
  {/open}
</div>
```

The `watch` on `client` is the key move: the list reloads whenever the client changes, **no matter who changed it** — `ClientPicker`, the `init()` seed from the Bootstrapping section, or any future writer. The cause (client changed) and the effect (reload trainees) live with the data, not bolted onto one button. The template reads `trainees` and `trainee` from the store and re-renders automatically when the fetch resolves.

### Sibling — opens via the store

```dust
{! views/components/ClientInfoModal.dust !}
<script>
({
  close() {
    this.store.modal = null;
  },
})
</script>

<div>
  {@eq key=modal value="client-info"}
    <div class="modal-backdrop">
      <div class="modal">
        <h3>Fiche client</h3>
        {?client}
          <div>Nom: {client.name}</div>
          <div>Email: {client.email}</div>
        {/client}
        <button on:click="close">Fermer</button>
      </div>
    </div>
  {/eq}
</div>
```

`RegistrationForm` writes `store.modal` from its `openClientInfo` handler (shown in the Parent section above). `ClientInfoModal` lives in a different subtree — but it reads `modal` from the store and re-renders. No DOM crawling, no `querySelector`, no event bubbling.

## Watchers — when an event handler isn't enough

99% of side effects belong in event handlers (clicks, inputs, etc.) — that's where the cause lives. But sometimes the trigger is a state change with no handler to hook into:

- A child reacting to a prop the parent just replaced
- Synchronising store to URL / localStorage / analytics
- Subscribing/unsubscribing to a WebSocket when an id changes

For those, declare a `watch:` map. Keys follow the same flat naming as templates; prefix with `state.` / `props.` / `store.` when you need to disambiguate.

```js
({
  watch: {
    // flat: defaults to store
    client(client, prev) { … },

    // explicit
    'state.open'(open)   { if (open) this.focusInput(); },
    'store.modal'(modal) { analytics.track('modal', modal); },
  },
})
```

Watchers fire on change only (not at mount), receive `(newValue, oldValue)`, can be async, and run in addition to (not instead of) the re-render.

## Conventions and gotchas

- **Props shadow store in template lookup.** Flat template references resolve in this order: **derived (getters) → state → props → store**. If you pass a name in props and also write it to the store, the prop wins and the store write has no visible effect. Either drop the prop, rename one of them, or accept that you must update the prop instead (`this.props.X = newValue` — the props proxy is reactive too).
- **Reactivity is deep.** `this.store.client = newClient` and `this.store.client.name = 'Bob'` both re-render subscribers (array mutators like `store.items.push(x)` too) — same as `state`.
- **Subscriptions are keyed by the top-level key.** Reading `store.client.email` subscribes the component to `client`, so any change under `client` re-renders it. Watchers, by contrast, fire on the exact dotted path (see below).
- **Store is per page load, page-scoped.** One instance per page, reset on navigation. No SPA, no persistence — use localStorage or a server roundtrip for anything that should survive.
- **SSR doesn't populate the store.** The store doesn't even exist on the server — the helper renders each component in isolation, with no page-level singleton. `init()` (which seeds the store) is client-only, so nothing can populate the store during SSR; `store.client` is always `undefined` server-side. Templates must be defensive (`{?client}…{/client}`), and any value you want in the server HTML must arrive via **props**, not the store.
- **Watchers fire on `Object.is` inequality, on the exact path.** `watch: { 'store.client.name'() }` fires on `store.client.name = 'Bob'` but not on a sibling change; a watcher on `store.client` fires when you reassign `client`, not on a nested mutation. Replacing with a structurally-equal-but-new object (`store.client = {...store.client}`) still fires (new reference).
- **Watcher initial value is `undefined` if the key isn't yet set.** The first fire after a write passes `(value, undefined)`.
- **Subscriber fire order is not guaranteed.** If two components are subscribed to the same key, they both re-render but the order between them is implementation-defined. Don't rely on it.
- **Watchers don't auto-suppress recursion.** A watcher on `store.X` that writes back to `store.X` will re-fire — design the handler with an early-return when the new value is already in the desired form (e.g. enriched after fetch). Same applies to async writes after `await`.
