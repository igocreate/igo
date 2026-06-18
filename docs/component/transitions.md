
# Transitions

Components animate elements entering and leaving the DOM declaratively, with
`transition:*` attributes. The runtime applies CSS classes at the right moments
around reconciliation — it doesn't ship any animation itself, so you stay in full
control of the timing and easing through CSS.

## Basic usage

Give an element the phases you want. Here a drawer that slides in and out:

```dust
{?open}
  <aside class="drawer"
         transition:enter="transition duration-300 ease-out"
         transition:enter-from="-translate-x-full"
         transition:enter-to="translate-x-0"
         transition:leave="transition duration-200 ease-in"
         transition:leave-from="translate-x-0"
         transition:leave-to="-translate-x-full">
    …
  </aside>
{/open}
```

When `state.open` flips to `true`, the `<aside>` is added and the enter transition
plays; when it flips to `false`, the element stays in the DOM long enough to play
the leave transition, then is removed.

## The phases

| Attribute | When |
|-----------|------|
| `transition:enter`      | active class(es) for the whole enter — carries `transition-*` |
| `transition:enter-from` | initial state, applied at insertion, removed on the next frame |
| `transition:enter-to`   | target state, applied on the next frame |
| `transition:leave`      | active class(es) for the whole leave |
| `transition:leave-from` | initial state, applied when leaving starts |
| `transition:leave-to`   | target state, applied on the next frame |

Each attribute is a space-separated class list. All phases are optional: declare
only enter, only leave, or both.

## Presets — avoid repeating the phases

Six attributes per element gets verbose. Register a named preset once and reuse it
with a single `transition:preset` attribute:

```js
// js/main.js
const { start, Transitions } = require('@igojs/component/client');

Transitions.preset('dropdown', {
  enter:     'transition ease-out duration-100',
  enterFrom: 'opacity-0 scale-95',    enterTo:  'opacity-100 scale-100',
  leave:     'transition ease-in duration-75',
  leaveFrom: 'opacity-100 scale-100', leaveTo:  'opacity-0 scale-95',
});

start();
```
```dust
<div transition:preset="dropdown">…</div>
```

Each phase is a space-separated string (or an array). Explicit `transition:*`
attributes override the preset per phase, so you can reuse a preset and tweak one
phase inline:

```dust
<aside transition:preset="dropdown" transition:enter-from="-translate-x-full">…</aside>
```

::: tip Why define presets in your app's JS, not in the framework
Tailwind's scanner reads your sourced files (the skeleton sources `./js/**/*.js`) and
keeps the utility classes it finds there as literal strings. Presets registered in
your app JS are therefore safe from purging. Classes that live only inside
`node_modules` aren't scanned — which is exactly why igo ships **no** built-in
presets: a `fade` preset baked into the framework would have its utilities purged.
Define presets where Tailwind can see them: your own code.
:::

## CSS-agnostic — not tied to Tailwind

The classes are applied verbatim with `classList`. They can be Tailwind utilities,
your own CSS classes, or any framework's:

```dust
<!-- your own CSS -->
<div transition:enter="fade" transition:enter-from="is-hidden" transition:enter-to="is-shown">
```
```css
.fade      { transition: opacity .3s; }
.is-hidden { opacity: 0; }
.is-shown  { opacity: 1; }
```

The Tailwind synergy is a side benefit: because the utilities appear literally in
the markup, Tailwind's scanner sees them and won't purge them — a class only ever
added at runtime (the old "toggle a class from JS" pattern) is liable to be purged.

## Animating a value change

Transitions fire when a node is added or removed — not when text inside it merely
updates (reconciliation patches that in place). To animate a *changing value*, tie
`data-key` to the value: each change makes the key differ, so the old node is
removed and a new one added, which the enter transition then animates. This is the
same idea as Vue's `:key`.

```dust
<span data-key="count-{count}" class="inline-block text-2xl font-bold"
      transition:enter="transition duration-200 ease-out"
      transition:enter-from="opacity-0 scale-50"
      transition:enter-to="opacity-100 scale-100">{count}</span>
```

Each time `count` changes the number pops in. Use `inline-block` (or a block/flex
context) so the `scale`/`translate` transforms apply — they're ignored on inline
elements. Add a `transition:leave` too if you want the old value to animate out
(it then briefly overlaps the new one — stack them with absolute positioning for a
flip effect).

## How it works

Transitions hook the reconciliation step ([morphdom](https://github.com/patrick-steele-idem/morphdom)):

- **Enter** — when a node is *added* during a render, the active + `*-from` classes
  are applied, then on the next animation frame `*-from` is swapped for `*-to`,
  driving the CSS transition. Classes are cleaned up on `transitionend`.
- **Leave** — when a node *carrying a leave transition* would be removed, it is kept
  in place, the leave classes play, and the node is removed for real on
  `transitionend`.

If the element has no CSS transition (computed duration `0`), it is added/removed
immediately. A safety timeout removes the node even if `transitionend` never fires,
so a missing transition never leaks nodes.

## Things to know

- **No enter on the first paint.** Server-rendered (or initial) nodes already exist,
  so enter only plays on *subsequent* renders — matching Vue's no-`appear`-by-default.
- **Put the transition on the toggled element itself.** Transitions fire for the
  element added/removed by reconciliation. If you wrap it in a larger block that is
  removed wholesale, the inner element won't get its own leave transition.
- **Stable siblings.** An element animating next to a conditional block can be
  recreated if its sibling order shifts. Pin its identity with
  [`data-key`](./ssr#keying-plain-elements-with-data-key) so its node is preserved
  across renders.
- **Fast re-toggle.** With [`data-key`](./ssr#keying-plain-elements-with-data-key),
  re-adding an element while it is still leaving cancels the leave and reuses the
  same node — no flicker, no lost node. Without a key, the leaving copy and the
  fresh one briefly coexist; the leaving copy removes itself when its transition ends.
