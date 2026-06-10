

const OPEN_COMMENT_REGEXP   = /\{!/g;
const CLOSE_COMMENT_REGEXP  = /!\}/g;
const DOUBLE_QUOTES_REGEXP  = /"/g;

const STRING_PARAM_REGEXP   = /([\w-]+)=("[^"]*")/g;
const REF_PARAM_REGEXP      = /(\w+)=([^" \n\r]+)/g;
const SHORTHAND_REGEXP      = /(?:^|\s)(\w+)(?=\s|$)/g;
const UNNAMED_STRING_REGEXP = /[^=] ?("[^"]*")/;

// strip comments
module.exports.removeComments = (str) => {
  let openCommentMatch, closeCommentMatch;

  OPEN_COMMENT_REGEXP.lastIndex = 0;

  // find opening '{!'
  while ((openCommentMatch = OPEN_COMMENT_REGEXP.exec(str)) !== null) {
    const index = openCommentMatch.index + 2;
    // find closing '!}'
    CLOSE_COMMENT_REGEXP.lastIndex = index;
    if ((closeCommentMatch = CLOSE_COMMENT_REGEXP.exec(str)) !== null) {
      str = str.slice(0, openCommentMatch.index) + str.slice(closeCommentMatch.index + 2);
      // the text shifted left: resume scanning from the removal point
      OPEN_COMMENT_REGEXP.lastIndex = openCommentMatch.index;
    }
  }

  return str;
};

// remove double quotes
module.exports.stripDoubleQuotes = (s) => {
  return s.replace(DOUBLE_QUOTES_REGEXP, '');
};

//
module.exports.parseTag = (s) => {
  const i = s.indexOf(' ');
  if (i >= 0) {
    s = s.substring(0, i);
  }
  return s.substring(1);
};

const FORBIDDEN_FIRST_CHARS = [ '\'', '{', '[' ];

//
module.exports.parseParams = (s) => {
  const params    = {};
  const original  = s;
  let match;

  // string param (allow '-' in the name, e.g. `data-on-change="onClientChange"`)
  STRING_PARAM_REGEXP.lastIndex = 0;
  while ((match = STRING_PARAM_REGEXP.exec(s)) !== null) {
    params[match[1]] = match[2];
    s = s.substring(0, match.index) + s.substring(STRING_PARAM_REGEXP.lastIndex);
    STRING_PARAM_REGEXP.lastIndex = match.index;
  }

  // ref param
  REF_PARAM_REGEXP.lastIndex = 0;
  while ((match = REF_PARAM_REGEXP.exec(s)) !== null) {
    if (FORBIDDEN_FIRST_CHARS.indexOf(match[2][0]) >= 0) {
      throw new Error(`Unexpected character "${match[2][0]}" in tag {${original}...`);
    }
    params[match[1]] = match[2];
    s = s.substring(0, match.index) + s.substring(REF_PARAM_REGEXP.lastIndex);
    REF_PARAM_REGEXP.lastIndex = match.index;
  }

  // shorthand param: `count` is equivalent to `count=count`
  SHORTHAND_REGEXP.lastIndex = 0;
  while ((match = SHORTHAND_REGEXP.exec(s)) !== null) {
    if (!params[match[1]]) {
      params[match[1]] = match[1];
    }
  }

  // unnamed string param
  if ((match = UNNAMED_STRING_REGEXP.exec(s)) !== null) {
    params.$ = match[1];
  }

  return params;
};
