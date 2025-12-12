

const ParseUtils  = require('../parse/ParseUtils');

const ASYNC_FUNCTION = Object.getPrototypeOf(async function(){}).constructor;

class Compiler {

  constructor() {
    this.i      = 0;
    this.parts  = [];
    this.parts.push(`var r='',l=l||{},c=c||{ctx:[]};`);
    this.parts.push('var a=s?function(x){s.write(String(x))}:function(x){r+=x};');
  }

  compileBuffer(buffer) {
    // precompile, for content functions
    buffer.forEach(block => {
      if (block.type === '<') {
        this.parts.push(`c._${block.tag}=async function(){var r='';`);
        this.parts.push('var a=s?function(x){s.write(String(x))}:function(x){r+=x};');
        this.compileBuffer(block.buffer);
        this.parts.push('return r;};');
      }
    });

    //
    buffer.forEach(block => {
      if (block.type === 'r') {
        // reference
        this.parts.push(`a(${this._getReference(block)});`);
      } else if (block.type === '+' && !block.tag) {
        // insert body (invoke content function)
        this.parts.push(`if(c._$body){a(await c._$body());c._$body=null;}`);
      } else if (block.type === '+') {
        // insert content (invoke content function)
        this.parts.push(`if(c._${block.tag}){a(await c._${block.tag}())}`);
        if (block.buffer) {
          this.parts.push('else{');
          this.compileBuffer(block.buffer);
          this.parts.push('}');
        }
      } else if (block.type === '?' || block.type === '^' ) {
        // conditional block
        const not = block.type === '^' ? '!' : '';
        this._pushContext(block.params);
        this.parts.push(`if(${not}u.b(${this._getValue(block.tag)})){`);
        this.compileBuffer(block.buffer);
        this.parts.push('}');
        this._else(block);
        this._popContext(block.params);
      } else if (block.type === '#') {
        // loop block
        this.i = this.i + 1;
        const { i } = this;
        this._pushContext(block.params, true);
        this.parts.push(`var a${i}=u.a(${this._getValue(block.tag)});`);
        this.parts.push(`if(a${i}){`);
        if (!block.buffer) {
          this.parts.push(`a(a${i})`);
        } else {
          const it = block.params.it && ParseUtils.stripDoubleQuotes(block.params.it);
          this.parts.push(`l.$length=a${i}.length;`); // current array length
          this.parts.push(`for(var i${i}=0;i${i}<a${i}.length;i${i}++){`);
          if (it) {
            this.parts.push(`l.${it}=a${i}[i${i}];`);
          }
          this.parts.push(`l._it=a${i}[i${i}];`);
          this.parts.push(`l.$idx=i${i};`); // current id
          this.compileBuffer(block.buffer, true);
          this.parts.push('}');
        }
        this.parts.push('}');
        this._else(block);
        this._popContext(block.params, true);
      } else if (block.type === '@') {
        // helper
        this.i = this.i + 1;
        const { i } = this;

        // precompile buffer as function if it exists
        if (block.buffer) {
          this.parts.push(`c._h_body${i}=async function(l_override){`);
          this.parts.push(`var l_saved=l;`);
          this.parts.push(`if(l_override){l={...l,...l_override};}`);
          this.parts.push(`var r='';`);
          this.parts.push('var a=s?function(x){s.write(String(x))}:function(x){r+=x};');
          this.compileBuffer(block.buffer);
          this.parts.push('l=l_saved;');
          this.parts.push('return r;};');
        }

        const bodyParam = block.buffer ? `c._h_body${i}` : 'null';
        this.parts.push(`var h${i}=await u.h('${block.tag}',${this._getParams(block.params)},l,${bodyParam});`);

        if (block.buffer) {
          this.parts.push(`var h${i}_t=typeof h${i};`);
          this.parts.push(`if(h${i}_t==='string'||h${i}_t==='number'){a(h${i});}`);
          this.parts.push(`else if(h${i}){a(await c._h_body${i}());}`);
          this._else(block);
        } else {
          this.parts.push(`if(h${i}!==null&&h${i}!==undefined){`);
          this.parts.push(`a(h${i});`);
          this.parts.push('}');
          this._else(block);
        }
      } else if (block.type === '>') {
        // include

        // precompile if buffer
        if (block.buffer) {
          this.parts.push(`c._$body=async function(){var r='';`);
          this.parts.push('var a=s?function(x){s.write(String(x))}:function(x){r+=x};');
          this.compileBuffer(block.buffer);
          this.parts.push('return r;};');
        }

        this._pushContext(block.params);
        const file = this._getParam(block.file);
        this.parts.push(`a(await (await u.i(${file}))(l,u,c,s));`);
        this._popContext(block.params);
      } else if (!block.type){
        // default: raw text
        this.parts.push(`a('${block}');`);
      }
    });
  }

  // Generates the template function source code
  toSource(buffer) {
    this.compileBuffer(buffer);
    this.parts.push('return r;');
    return this.parts.join('');
  }

  // Compiles the template into an executable function
  compile(buffer) {
    const sourceCode = this.toSource(buffer);
    // console.log(sourceCode);
    return new ASYNC_FUNCTION('l', 'u', 'c', 's', sourceCode);
  }

  _else(block) {
    if (block.bodies && block.bodies.else) {
      this.parts.push('else{');
      this.compileBuffer(block.bodies.else);
      this.parts.push('}');
    }
  }

  _pushContext(params, isArray) {
    const { i } = this;
    this.parts.push(`var ctx${i}={};`);
    Object.keys(params).forEach(key => {
      if (key === '$') {
        return;
      }
      this.parts.push(`ctx${i}.${key}=l.${key};`);
      this.parts.push(`l.${key}=${this._getParam(params[key])};`);
    });
    if (isArray) {
      this.parts.push(`ctx${i}._it=l._it;`);
      this.parts.push(`ctx${i}.idx=l.$idx;`);
      this.parts.push(`ctx${i}.length=l.$length;`);
    }

    this.parts.push(`c.ctx.push(ctx${i});`);
  }

  _popContext(params, isArray) {
    const { i } = this;
    this.parts.push(`var p_ctx${i}=c.ctx.pop();`);
    Object.keys(params).forEach(key => {
      if (key === '$') {
        return;
      }
      this.parts.push(`l.${key}=p_ctx${i}.${key};`);
    });
    if (isArray) {
      this.parts.push(`l._it=p_ctx${i}._it;`);
      this.parts.push(`l.$idx=p_ctx${i}.idx;`);
      this.parts.push(`l.$length=p_ctx${i}.length;`);
    }
  }


  //
  _addParamsToLocals(params) {
    const { i } = this;
    Object.keys(params).forEach(key => {
      if (key === '$') {
        return;
      }
      this.parts.push(`c.p_${key}${i}=l.${key};`);
      this.parts.push(`l.${key}=${this._getParam(params[key])};`);
    });
  }

  //
  _cleanParamsFromLocals(params) {
    const { i } = this;
    Object.keys(params).forEach(key => {
      if (key === '$') {
        return;
      }
      this.parts.push(`l.${key}=c.p_${key}${i};`);
      this.parts.push(`delete c.p_${key}${i};`);
    });
  }

  _getParam(param) {
    if (param[0] === '"') {
      // string
      let ret = [], match, index = 0, s;

      param = ParseUtils.stripDoubleQuotes(param);
      if (!param) {
        // empty string
        return '\'\'';
      }

      // replace references in string
      const ref = new RegExp('\\{([^\\}]*)\\}', 'msg');
      while ((match = ref.exec(param)) !== null) {
        // left part
        s = param.substring(index, match.index).replace(/'/g, '\\\'');
        ret.push(`'${s}'`);
        index = match.index + match[0].length;
        ret.push(this._getValue(match[1], 'u.d'));
      }
      // final right part
      if (index < param.length) {
        s = param.substring(index, param.length);
        // escape single quotes
        s = s.replace(/'/g, '\\\'');
        ret.push(`'${s}'`);
      }
      return ret.join('+');
    }

    if (!isNaN(param)) {
      return param;
    }

    // ref
    return this._getValue(param);
  }

  //
  _getValue(tag, utilFn='u.v') {
    
    if (!isNaN(tag)) {
      return tag;
    }
    
    // . notation
    if (tag === '.') {
      return 'l._it';
    } else if (tag[0] === '.') {
      tag = '_it' + tag;
    }

    const elements = [];
    let i, c, sub = false, idx = 0;
    // parse ref
    for (i = 0; i < tag.length; i = 1 + i) {
      c = tag[i];
      if (!sub && (c === '.' || c === '[')) {
        if (i > idx) {
          elements.push(tag.substring(idx, i));
        }
        idx = i + 1;
        sub = (c === '[');
      } else if (c === ']') {
        elements.push('[' + this._getValue(tag.substring(idx, i)) + ']');
        sub = false;
        idx = i + 1;
      }
    }

    // last part
    if (i > idx) {
      elements.push(tag.substring(idx, i));
    }

    // build string
    let current = 'l', ret = [];
    elements.forEach((element) => {
      if (element[0] === '[') {
        current += element;
      } else {
        current += '.' + element;
      }
      ret.push(current);
    });

    // use utilFn (u.v by default) to invoke function on last element
    if (ret.length === 1) {
      return `${utilFn}(${ret[0]},null,l)`;
    }
    const _this = ret.slice(0,-1);
    return `${utilFn}(${ret.join('&&')},${_this.join('&&')},l)`;

  }

  _getParams(params) {
    let ret = '{';
    for (let key in params) {
      ret += `${key}:${this._getParam(params[key])},`;
    }
    ret += '}';
    return ret;
  }

  _getReference(block) {
    let ret = this._getValue(block.tag, 'u.d');
    if (!block.f) {
      return ret;
    }
    block.f.forEach(f => {
      ret = `u.f.${f}(${ret})`;
    });
    return ret;
  }

}

module.exports = Compiler;
