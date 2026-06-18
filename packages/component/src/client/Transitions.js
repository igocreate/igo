/* global requestAnimationFrame, getComputedStyle */
/**
 * Enter/exit transitions, applied at morphdom add/discard time.
 *
 * CSS-agnostic: the class strings are applied verbatim with classList — they can
 * be Tailwind utilities, your own CSS classes, anything. Because they live in the
 * markup, a JIT scanner (Tailwind) sees them and won't purge them.
 *
 * Vue-style phases on a `transition:*` attribute set:
 * - enter / leave         active class(es) present for the whole transition
 *                         (carry transition-property/duration)
 * - enter-from / leave-from   initial state, applied then removed next frame
 * - enter-to   / leave-to     target state, applied next frame
 *
 *   <aside transition:enter="transition duration-300"
 *          transition:enter-from="-translate-x-full"
 *          transition:enter-to="translate-x-0"
 *          transition:leave="transition duration-200"
 *          transition:leave-to="-translate-x-full">…</aside>
 */

const PHASES   = ['enter', 'enter-from', 'enter-to', 'leave', 'leave-from', 'leave-to'];
// Maps each spec key to its attribute phase name.
const PHASE_KEYS = [
  ['enter', 'enter'], ['enterFrom', 'enter-from'], ['enterTo', 'enter-to'],
  ['leave', 'leave'], ['leaveFrom', 'leave-from'], ['leaveTo', 'leave-to'],
];
const SELECTOR = [...PHASES.map(p => `[transition\\:${p}]`), '[transition\\:preset]'].join(',');
const MAX_MS   = 5000;  // safety cap if transitionend never fires

const attr = (phase) => `transition:${phase}`;

const EMPTY_SPEC = { enter: [], enterFrom: [], enterTo: [], leave: [], leaveFrom: [], leaveTo: [] };

// Named presets, e.g. transition:preset="fade". Register from app JS so a JIT
// scanner (Tailwind) sees the utility strings and won't purge them — strings in
// node_modules aren't scanned, which is why the framework ships none.
const PRESETS = {};
const toList = (v) => Array.isArray(v) ? v.slice() : (v ? String(v).split(/\s+/).filter(Boolean) : []);

const preset = (name, spec = {}) => {
  PRESETS[name] = {};
  for (const [key] of PHASE_KEYS) {
    PRESETS[name][key] = toList(spec[key]);
  }
  return PRESETS[name];
};

// True if the element declares any transition:* attribute (phase or preset).
const hasTransition = (el) =>
  !!(el && el.nodeType === 1 && typeof el.hasAttribute === 'function' &&
    (el.hasAttribute('transition:preset') || PHASES.some(p => el.hasAttribute(attr(p)))));

// Read each phase's class list into a spec. Pure — only reads attributes. A
// `transition:preset` supplies the base; explicit phase attributes override it.
const readSpec = (el) => {
  const presetName = typeof el.getAttribute === 'function' ? el.getAttribute('transition:preset') : null;
  const base = (presetName && PRESETS[presetName]) || EMPTY_SPEC;
  const spec = {};
  for (const [key, phase] of PHASE_KEYS) {
    const v = el.getAttribute(attr(phase));
    spec[key] = v != null ? v.split(/\s+/).filter(Boolean) : base[key];
  }
  return spec;
};

const hasEnter = (s) => s.enter.length || s.enterFrom.length || s.enterTo.length;
const hasLeave = (s) => s.leave.length || s.leaveFrom.length || s.leaveTo.length;

// Double rAF: ensures the from-state is painted before swapping to the to-state.
const nextFrame = (fn) => requestAnimationFrame(() => requestAnimationFrame(fn));

const toMs = (value) => String(value).split(',').reduce((max, part) => {
  const n = parseFloat(part);
  if (isNaN(n)) { return max; }
  return Math.max(max, part.trim().endsWith('ms') ? n : n * 1000);
}, 0);

const durationMs = (el) => {
  const s = getComputedStyle(el);
  return toMs(s.transitionDuration || '0s') + toMs(s.transitionDelay || '0s');
};

// Run cb once the element's CSS transition ends; immediately if there is none,
// with a timeout fallback so a missing transitionend never leaks the node.
// Returns a canceller that detaches the listener/timer without running cb.
const whenDone = (el, cb) => {
  const dur = durationMs(el);
  if (dur <= 0) { cb(); return () => {}; }
  let done = false;
  const teardown = () => {
    done = true;
    el.removeEventListener('transitionend', onEnd);
    clearTimeout(timer);
  };
  const finish = () => {
    if (done) { return; }
    teardown();
    cb();
  };
  const onEnd = (e) => { if (e.target === el) { finish(); } };
  el.addEventListener('transitionend', onEnd);
  const timer = setTimeout(finish, Math.min(dur + 50, MAX_MS));
  return () => { if (!done) { teardown(); } };
};

const runEnter = (el, spec) => {
  el.classList.add(...spec.enter, ...spec.enterFrom);
  nextFrame(() => {
    el.classList.remove(...spec.enterFrom);
    el.classList.add(...spec.enterTo);
    whenDone(el, () => el.classList.remove(...spec.enter, ...spec.enterTo));
  });
};

const runLeave = (el, spec, remove) => {
  let cancelled = false;
  let cancelWait = null;  // armed once the transitionend wait starts

  // Stash a canceller so a re-add mid-leave (see cancelLeave) can abort the
  // pending removal and strip the leave classes, whatever phase we're in.
  el.__igoCancelLeave = () => {
    cancelled = true;
    if (cancelWait) { cancelWait(); }
    el.classList.remove(...spec.leave, ...spec.leaveFrom, ...spec.leaveTo);
    delete el.__igoCancelLeave;
  };

  el.classList.add(...spec.leave, ...spec.leaveFrom);
  nextFrame(() => {
    if (cancelled) { return; }
    el.classList.remove(...spec.leaveFrom);
    el.classList.add(...spec.leaveTo);
    cancelWait = whenDone(el, () => {
      delete el.__igoCancelLeave;
      remove();
    });
  });
};

// Play the enter transition on a freshly added node and any transition
// descendants (morphdom only fires onNodeAdded for the outermost added node).
const enterAdded = (node) => {
  if (!node || node.nodeType !== 1) { return; }
  const play = (el) => {
    const spec = readSpec(el);
    if (hasEnter(spec)) { runEnter(el, spec); }
  };
  if (hasTransition(node)) { play(node); }
  if (typeof node.querySelectorAll === 'function') {
    node.querySelectorAll(SELECTOR).forEach(play);
  }
};

// Play the leave transition, removing the node when it ends. Returns true if it
// took ownership of the node (caller must keep it); false if there is nothing to
// animate (caller discards normally).
const leave = (el, remove) => {
  if (!hasTransition(el)) { return false; }
  const spec = readSpec(el);
  if (!hasLeave(spec)) { return false; }
  runLeave(el, spec, remove);
  return true;
};

// Abort an in-flight leave on a node that's being re-added: cancels the pending
// removal and strips the leave classes so it can update in place as normal.
// Returns true if a leave was actually cancelled.
const cancelLeave = (el) => {
  if (el && typeof el.__igoCancelLeave === 'function') {
    el.__igoCancelLeave();
    return true;
  }
  return false;
};

module.exports = { hasTransition, readSpec, hasEnter, hasLeave, enterAdded, leave, cancelLeave, preset };
