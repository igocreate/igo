

// remove spaces and double quotes
module.exports.cleanStr = (s) => {
  const regexp = /["]*(.[^"]*)/;
  const match  = regexp.exec(s);
  return match && match[1];
};

// strip comments
module.exports.removeComments = (str) => {
  let index = 0;
  let openCommentMatch, closeCommentMatch;

  const openCommentRegexp   = new RegExp('{!', 'msg');
  const closeCommentRegexp  = new RegExp('!}', 'msg');

  // find opening '{!'
  while ((openCommentMatch = openCommentRegexp.exec(str)) !== null) {
    index = openCommentMatch.index + 2;
    // find closing '!}'
    closeCommentRegexp.lastIndex = index;
    while ((closeCommentMatch = closeCommentRegexp.exec(str)) !== null) {
      str = str.slice(0, openCommentMatch.index) + str.slice(closeCommentMatch.index + 2);
      break;
    };
  }

  return str;
};

// remove spaces and double quotes
module.exports.stripDoubleQuotes = (s) => {
  const regexp = new RegExp('"', 'sg');
  return s.replace(regexp, '');
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
  const original  = s
  let match;
  
  // string param
  const stringParam = new RegExp('(\\w+)=("[^"]*")', 'msg');
  while ((match = stringParam.exec(s)) !== null) {
    params[match[1]] = match[2];
    s = s.substring(0, match.index) + s.substring(stringParam.lastIndex);
    stringParam.lastIndex = match.index;
  }

  // ref param
  const refParam = new RegExp('(\\w+)=([^" \n\r]+)', 'msg');
  while ((match = refParam.exec(s)) !== null) {
    if (FORBIDDEN_FIRST_CHARS.indexOf(match[2][0]) >= 0) {
      throw new Error(`Unexpected character "${match[2][0]}" in tag {${original}...`);
    }
    params[match[1]] = match[2];
    s = s.substring(0, match.index) + s.substring(refParam.lastIndex);
    refParam.lastIndex = match.index;
  }

  // unnamed string param
  const unnamedStringParam = new RegExp('[^=] ?("[^"]*")', 'msg');
  if ((match = unnamedStringParam.exec(s)) !== null) {
    params.$ = match[1];
  }

  return params;
};