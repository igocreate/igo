
const ParseUtils  = require('./ParseUtils');
const Tags        = require('./Tags');

const config      = require('../Config');


class Parser {

  static OPEN_REGEXP   = new RegExp('(.*?)\\{', 'msg');
  static CLOSE_REGEXP  = new RegExp('(.*?)\\}', 'msg');

  constructor() {
    this.global     = [];           // global buffer, to be returned by parse function
    this.buffer     = this.global;  // current buffer, where content is added
    this.stack      = [];           // stack of parents blocks
    this.contents   = {};           // contents to be replaced in layouts
  }

  // add string
  pushString(str) {
    if (config.htmltrim) {
      // Whitespace handling rules when htmltrim is enabled:
      // 1. Preserve multiple spaces on same line: "Hello  World" stays "Hello  World"
      // 2. Normalize end-of-line + start-of-line: "Hello\n  World" → "Hello World"
      // 3. Remove whitespace between HTML tags: "<div>\n  <span>" → "<div><span>"
      // 4. Trim is done in parse() before parsing

      // remove newlines between HTML tags (preserves simple spaces and tabs)
      str = str.replace(/>\s*[\r\n]+\s*</g, '><');
      // normalize newlines and adjacent spaces to single space (preserves multiple spaces on same line)
      str = str.replace(/\s*[\r\n]+\s*/g, ' ');
      // escape backslashes
      str = str.replace(/\\/g, '\\\\');
    }

    // escape single quotes
    str = str.replace(/'/g, '\\\'');
    
    const i     = this.buffer.length - 1;
    const last  = this.buffer[i];

    // concat with previous string buffer
    if (typeof last === 'string') {
      this.buffer[i] = last + str;
      return;
    }
    
    // push
    this.buffer.push(str);
  }

  // push block
  pushBlock(block) {
    this.buffer.push(block);
  }

  // stack the block, use its buffer as current
  stackBlock(block)  {
    block.buffer  = [];
    block.current = block.buffer;
    this.buffer   = block.buffer;
    this.stack.push(block);
  }

  getLastBlock() {
    return this.stack[this.stack.length-1];
  }

  pop() {
    const block = this.stack.pop();
    const last  = this.getLastBlock();
    this.buffer = last && last.current || this.global;
    return block;
  }

  addBody(tag) {
    const last = this.getLastBlock();
    if (!last) {
      throw new Error('Cannot add body outside of a block');
    }
    last.bodies       = last.bodies || {};
    last.bodies[tag]  = [];
    last.current      = last.bodies[tag];
    this.buffer       = last.bodies[tag];
  }

  parse(str) {
    if (!config.htmltrim) {
      str = str.replace(/\r/g , '\\r').replace(/\n/g , '\\n');
    }

    // remove comments
    str = ParseUtils.removeComments(str);

    // trim leading and trailing whitespace
    if (config.htmltrim) {
      str = str.trim();
    }

    const openRegexp   = Parser.OPEN_REGEXP;
    const closeRegexp  = Parser.CLOSE_REGEXP;
    openRegexp.lastIndex = 0;
    closeRegexp.lastIndex = 0;

    let index = 0;

    // find opening '{'
    let openMatch, closeMatch;
    while ((openMatch = openRegexp.exec(str)) !== null) {
      if (openMatch[1]) {
        // preceding string
        this.pushString(openMatch[1]);
      }
      index = openMatch.index + openMatch[0].length;

      // find closing '}'
      let tag = '';
      closeRegexp.lastIndex = index;
      while ((closeMatch = closeRegexp.exec(str)) !== null) {
        tag += closeMatch[1];
        // skip when closing an internal '{'
        if (closeMatch[1].lastIndexOf('{') === -1) {
          break;
        }
        tag += '}';
      }

      if (!closeMatch) {
        // parsing error
        throw new Error(`Missing closing "}" at index ${index}`);
      }

      index = closeMatch.index + closeMatch[0].length;
      openRegexp.lastIndex = index;

      if (!this.parseTag(tag)) {
        // tag is ignored: push content to buffer
        this.pushString(`{${tag}}`);
      }
    }

    // stack should be empty
    if (this.stack.length > 0) {
      throw new Error(`Missing closing tag for {${this.stack[0].type}${this.stack[0].tag}...`);
    }

    if (index < str.length) {
      this.pushString(str.slice(index));
    }

    // console.log('--- done ---');
    // console.dir(this);
    return this.global;
  }

  // parse tag. returns true if tag was found
  parseTag(str) {

    const tag = Tags[str[0]];

    const block = {
      type: str[0],
      tag:  str,
    };

    if (!tag) {
      // skip this tag if it's not correct
      if (str.indexOf(' ') >= 0 || str.indexOf('(') >= 0 || str.indexOf(';') >= 0) {
        return false;
      }
      // reference
      block.type = 'r';
      this.parseFilters(str, block);
      this.pushBlock(block);
      return true;
    }
    
    // set self closing tag
    if (str.endsWith('/')) {
      block.selfClosedTag = true;
      str = str.substring(0, str.length - 1);
    }
    
    // remove first char
    block.tag = ParseUtils.parseTag(str);

    // parse params
    block.params = ParseUtils.parseParams(str);

    // invoke tag function
    tag(this, block);
    
    return true;
  }

  parseFilters(str, block) {
    // parse filters
    const filtersRegexp = new RegExp('([ ]*\\|[ ]*\\w+)+', 'g');
    const filtersMatch  = filtersRegexp.exec(str);
    if (filtersMatch) {
      block.tag = str.substring(0, filtersMatch.index);
      const f   = filtersMatch[0].replace(/ /g, '').substring(1).split('|');
      const s   = f.indexOf('s');
      if (s > -1) {
        f.splice(s, 1);
      } else if (config.htmlencode) {
        f.push('h');
      }
      block.f = f;
    } else if (config.htmlencode) {
      block.f = ['h'];
    }
  }

}

module.exports = Parser;
