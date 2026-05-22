// Compile-time inlining of dust's built-in `@`-helpers.

const COMPARISON_OP = {
  eq:  { op: '===' },
  ne:  { op: '!==' },
  lt:  { op: '<',  numeric: true },
  lte: { op: '<=', numeric: true },
  gt:  { op: '>',  numeric: true },
  gte: { op: '>=', numeric: true },
};

const LOOP_COND = {
  first: 'l.$idx===0',
  last:  'l.$length&&l.$length-1===l.$idx',
  sep:   'l.$length&&l.$length-1!==l.$idx',
};

exports.BUILTIN_TAGS = new Set([
  'select', 'none', 'any',
  'eq', 'ne', 'lt', 'lte', 'gt', 'gte',
  'first', 'last', 'sep',
]);

exports.tryCompile = (compiler, block) => {
  const tag = block.tag;
  if (!exports.BUILTIN_TAGS.has(tag)) {
    return false;
  }
  if (!compiler.selectStack) {
    compiler.selectStack = [];
  }

  if (LOOP_COND[tag])                     return emitConditional(compiler, block, LOOP_COND[tag]);
  if (tag === 'select')                   return emitSelect(compiler, block);
  if (tag === 'none' || tag === 'any')    return emitSelectMatched(compiler, block, tag);
  return emitComparison(compiler, block, COMPARISON_OP[tag]);
};

// `{@first}` / `{@last}` / `{@sep}` — fixed condition on the surrounding loop.
function emitConditional(compiler, block, cond) {
  compiler.parts.push(`if(${cond}){`);
  if (block.buffer) {
    compiler.compileBuffer(block.buffer);
  }
  compiler.parts.push('}');
  compiler._else(block);
  return true;
}

// `{@select key=X} ... {/select}` — push a context so child `@eq`/etc. can
// inherit the key and signal a match via `matched_N`.
function emitSelect(compiler, block) {
  if (!block.buffer) {
    return true;
  }
  const i = ++compiler.i;
  const keyExpr = compiler._getParam(block.params.key) || 'undefined';
  compiler.parts.push(`var matched${i}=false;`);
  compiler.selectStack.push({ keyExpr, matchedVar: `matched${i}` });
  compiler.compileBuffer(block.buffer);
  compiler.selectStack.pop();
  return true;
}

// `{@none}` / `{@any}` inside `{@select}` — check the matched flag.
function emitSelectMatched(compiler, block, tag) {
  if (compiler.selectStack.length === 0) {
    return true;
  }
  const { matchedVar } = compiler.selectStack[compiler.selectStack.length - 1];
  const cond = tag === 'none' ? `!${matchedVar}` : matchedVar;
  compiler.parts.push(`if(${cond}){`);
  if (block.buffer) {
    compiler.compileBuffer(block.buffer);
  }
  compiler.parts.push('}');
  compiler._else(block);
  return true;
}

// `{@eq}` / `{@ne}` / `{@lt}` / `{@lte}` / `{@gt}` / `{@gte}` — `key` may be
// inherited from an enclosing `{@select}`.
function emitComparison(compiler, block, comparison) {
  const value = compiler._getParam(block.params.value);
  const key   = compiler._getParam(block.params.key)
    ?? compiler.selectStack[compiler.selectStack.length - 1]?.keyExpr;

  if (key === undefined || value === undefined) {
    return true;
  }

  const cond = comparison.numeric
    ? `Number(${key})${comparison.op}Number(${value})`
    : `${key}${comparison.op}${value}`;

  compiler.parts.push(`if(${cond}){`);
  if (compiler.selectStack.length > 0) {
    compiler.parts.push(`${compiler.selectStack[compiler.selectStack.length - 1].matchedVar}=true;`);
  }
  if (block.buffer) {
    compiler.compileBuffer(block.buffer);
  }
  compiler.parts.push('}');
  compiler._else(block);
  return true;
}
