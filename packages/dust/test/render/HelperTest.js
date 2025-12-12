/* global describe, it */


const assert        = require('assert');
const Renderer      = require('../../src/render/Renderer');
const Helpers       = require('../../src/render/Helpers');

const HELPERS = {

  nl2br: function(params) {
    if (params.value) {
      return params.value.replace(/(\r\n|\n\r|\r|\n)/g, '<br/>');
    }
  },

  boolean: function(params) {
    const color = params.value ? 'success' : 'danger';
    return `<div class="bullet bullet-sm bullet-${color}"></div>`;
  },

  isNull: (params) => {
    return params.value === null;
  },

  // Example of a helper that uses the body function to repeat content
  repeat: async (params, locals, body) => {
    if (!body) {
      return '';
    }
    const times = Number(params.times) || 0;
    let result = '';

    for (let i = 0; i < times; i++) {
      result += await body({ $idx: i });
    }

    return result;
  }
};


describe('Render Helpers', () => {

  it('should render with eq helper', async () => {
    const template  = 'Hello {@eq key=w value="World"}{w}{/eq}';
    const r         = await new Renderer().render(template, { w: 'World' });
    assert.equal(r, 'Hello World');
  });

  it('should render with false eq helper', async () => {
    const template  = 'Hello {@eq key=w value="world"}{w}{/eq}';
    const r         = await new Renderer().render(template, { w: 'World' });
    assert.equal(r, 'Hello ');
  });

  it('should allow quotes in params', async () => {
    const template  = 'Hello {@eq key=w value="world\'s one"}{w}{/eq}';
    const r         = await new Renderer().render(template, { w: 'World\'s one' });
    assert.equal(r, 'Hello ');
  });

  it('should render with ne helper', async () => {
    const template  = 'Hello {@ne key=w value="world"}{w}{/ne}';
    const r         = await new Renderer().render(template, { w: 'World' });
    assert.equal(r, 'Hello World');
  });

  it('should render with false ne helper', async () => {
    const template  = 'Hello {@ne key=w value="World"}{w}{/ne}';
    const r         = await new Renderer().render(template, { w: 'World' });
    assert.equal(r, 'Hello ');
  });

  it('should not crash with missing params', async () => {
    const template  = 'Hello {@eq key=w}{w}{/eq}';
    const r         = await new Renderer().render(template, { w: 'World' });
    assert.equal(r, 'Hello ');
  });

  it('should not crash with wrong ref params', async () => {
    const template  = 'Hello {@eq key=e value="World"}{w}{/eq}';
    const r         = await new Renderer().render(template, { w: 'World' });
    assert.equal(r, 'Hello ');
  });

  it('should render with gt helper', async () => {
    const template  = 'Hello {@gt key=w value="2"}World{/gt}';
    let r           = await new Renderer().render(template, { w: 3 });
    assert.equal(r, 'Hello World');
    r               = await new Renderer().render(template, { w: 1 });
    assert.equal(r, 'Hello ');
  });

  it('should render with number value', async () => {
    const template  = 'Hello {@gt key=w value=2}World{/gt}';
    let r           = await new Renderer().render(template, { w: 3 });
    assert.equal(r, 'Hello World');
    r               = await new Renderer().render(template, { w: 1 });
    assert.equal(r, 'Hello ');
  });

  it('should render else', async () => {
    const template  = 'Hello {@eq key=w value="world"}{w}{:else}world !{/eq}';
    const r         = await new Renderer().render(template, { w: 'World' });
    assert.equal(r, 'Hello world !');
  });

  it.skip('should render select with eq', () => {
    const template  = 'Hello {@select key=w}{@eq value="puppies"}Puppies{/eq}{@eq value="bunnies"}test-bunnies{/eq}{/select}';
    const r         = new Renderer().render(template, { w: 'puppies' });
    assert.equal(r, 'Hello Puppies');
  });

  it('should render custom helper', async () => {
    
    Helpers.nl2br   = HELPERS.nl2br;
    Helpers.boolean = HELPERS.boolean;

    // boolean false
    let template = 'Hello ? {@boolean value=b /}';
    let r = await new Renderer(HELPERS).render(template, {b: false});
    assert.equal(r, 'Hello ? <div class="bullet bullet-sm bullet-danger"></div>');
    // boolean true
    r = await new Renderer(HELPERS).render(template, {b: true});
    assert.equal(r, 'Hello ? <div class="bullet bullet-sm bullet-success"></div>');
    // nl2br
    template = '{@nl2br value=text /}';
    r = await new Renderer(HELPERS).render(template, {text: 'Hello\nWorld'});
    assert.equal(r, 'Hello<br/>World');
  });

  Helpers.t = (params) => {
    return params.key;
  };

  it('should render custom helper with string param', async () => {
    const template  = 'Hello {@t key="World" /} !';
    const r         = await new Renderer().render(template);
    assert.equal(r, 'Hello World !');
  });

  it('should render custom helper with empty string param', async () => {
    const template  = 'Hello {@t key="" /} !';
    const r         = await new Renderer().render(template);
    assert.equal(r, 'Hello  !');
  });

  it('should render custom helper with ref param', async () => {
    const template  = 'Hello {@t key=txt.w /} !';
    const r         = await new Renderer().render(template, { txt: { w: 'World' }});
    assert.equal(r, 'Hello World !');
  });
  
  it('should render custom helper with string + ref param', async () => {
    const template  = 'Hello {#obj}{@t key="txt.{.attr}" /}{/obj} !';
    const r         = await new Renderer().render(template, { obj: {attr: 'w' } , txt: { w: 'World' }});
    assert.equal(r, 'Hello txt.w !');
  });

  it('should render custom helper with string + missingref param', async () => {
    const template  = 'Hello {#obj}{@t key="txt.{.attr}" /}{/obj} !';
    const r         = await new Renderer().render(template, { obj: 1 });
    assert.equal(r, 'Hello txt. !');
  });

  it('should send null param and not emptystring', async () => {
    Helpers.isNull  = HELPERS.isNull;
    const template  = 'Hello {@isNull value=obj /} !';
    const r         = await new Renderer().render(template, { obj: null});
    assert.equal(r, 'Hello true !');
  });

  it('should throw error if helper does not exist', async () => {
    const template  = 'Hello {@foo value=obj /} !';
    try {
      await new Renderer().render(template);
      assert.fail();
    } catch(err) {
      assert.equal(err.message, 'Error: helper @foo not found!');
    }
  });

  // Tests showing how to use the body function in custom helpers
  // The repeat helper demonstrates how helpers can receive and call the body function
  it('should render repeat helper with simple content', async () => {
    Helpers.repeat  = HELPERS.repeat;
    const template  = '{@repeat times=3}Hello{/repeat}';
    const r         = await new Renderer().render(template);
    assert.equal(r, 'HelloHelloHello');
  });

  it('should render repeat helper with complex content', async () => {
    const template  = '{@repeat times=3}<div>Item</div>{/repeat}';
    const r         = await new Renderer().render(template);
    assert.equal(r, '<div>Item</div><div>Item</div><div>Item</div>');
  });

  it('should render repeat helper with index', async () => {
    const template  = '{@repeat times=5}({$idx}){/repeat}';
    const r         = await new Renderer().render(template);
    assert.equal(r, '(0)(1)(2)(3)(4)');
  });

  it('should render repeat helper with dynamic times', async () => {
    const template  = '{@repeat times=count}x{/repeat}';
    const r         = await new Renderer().render(template, { count: 4 });
    assert.equal(r, 'xxxx');
  });

  it('should render repeat helper with zero times', async () => {
    const template  = 'Start {@repeat times=0}Never{/repeat} End';
    const r         = await new Renderer().render(template);
    assert.equal(r, 'Start  End');
  });

  it('should render repeat helper with context variables', async () => {
    const template  = '{@repeat times=3}{name}-{$idx} {/repeat}';
    const r         = await new Renderer().render(template, { name: 'test' });
    assert.equal(r, 'test-0 test-1 test-2 ');
  });

});