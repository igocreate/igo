
const SCRIPT_RE = /^<script>\n?([\s\S]*?)<\/script>\s*/;

/**
 * Split a single-file .dust component into script and template parts
 * @param {string} source - Raw .dust file content
 * @returns {{ scriptSrc: string|null, templateSrc: string }}
 */
const split = (source) => {
  const m = source.match(SCRIPT_RE);
  if (!m) {
    return { scriptSrc: null, templateSrc: source };
  }
  const scriptSrc   = m[1].trim();
  const templateSrc = source.slice(m[0].length);
  return { scriptSrc, templateSrc };
};

/**
 * Rewrite on:event="method" attributes to data-on-event="method"
 * This allows the Dust parser to handle them as regular attributes
 * @param {string} templateSrc - Template source
 * @returns {string} - Rewritten template source
 */
const rewriteOnEvents = (templateSrc) => {
  return templateSrc.replace(/\bon:([\w-]+)="([\w]+)"/g, 'data-on-$1="$2"');
};

module.exports = { split, rewriteOnEvents };
