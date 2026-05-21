# @igojs/component

Reactive single-file components with SSR for [Igo.js](https://igocreate.github.io/igo). One `.dust` file with `<script>` + template, deep reactivity via Proxy, automatic hydration, DiffDOM reconciliation.

## Install

```sh
npm install @igojs/component
```

## Quick start

A component is one `.dust` file:

```dust
{! views/components/Counter.dust !}
<script>
({
  props: { initial: 0 },
  state: { count: 0 },

  get doubled() { return this.state.count * 2; },

  onIncrement() { this.state.count++; }
})
</script>

<div>
  <p>Count: {count} (×2 = {doubled})</p>
  <button on:click="onIncrement">+1</button>
</div>
```

Render it server-side from any Dust template:

```dust
{@component name="components/Counter" initial=5 /}
```

In your client entry:

```js
const { start } = require('@igojs/component/client');
start();
```

## Documentation

Full documentation: <https://igocreate.github.io/igo/component/getting-started>

- [Getting started](https://igocreate.github.io/igo/component/getting-started)
- [Components](https://igocreate.github.io/igo/component/components)
- [Reactivity](https://igocreate.github.io/igo/component/reactivity)
- [Events & forms](https://igocreate.github.io/igo/component/events-forms)
- [SSR](https://igocreate.github.io/igo/component/ssr)
- [Translations](https://igocreate.github.io/igo/component/translations)
- [Internals](https://igocreate.github.io/igo/component/internals)

## License

ISC
