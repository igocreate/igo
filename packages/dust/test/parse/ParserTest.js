
/* global describe, it */

const assert  = require('assert');

const Parser  = require('../../src/parse/Parser');

describe('Parser', () => {
  it('should parse simple text', () => {
    const TEMPLATE = 'Hello World';
    const buffer = new Parser().parse(TEMPLATE);
    assert.equal(buffer.length, 1);
    assert.equal(buffer[0], TEMPLATE);
  });

  it('should escape quotes', () => {
    const TEMPLATE = 'Hello World\'s One';
    const buffer = new Parser().parse(TEMPLATE);
    assert.equal(buffer.length, 1);
    assert.equal(buffer[0], 'Hello World\\\'s One');
  });

  it('should parse reference', () => {
    const TEMPLATE = 'Hello {world}, ok.';
    const buffer = new Parser().parse(TEMPLATE);
    assert.equal(buffer.length, 3);
    assert.equal(buffer[0], 'Hello ');
    assert.equal(buffer[2], ', ok.');
  });

  it('should ignore incorrect tags ', () => {
    const TEMPLATE = 'Hello {world one} { world two }, ok.';
    const buffer = new Parser().parse(TEMPLATE);
    assert.equal(buffer.length, 1);
    assert.equal(buffer[0], TEMPLATE);
  });

  it('should ignore css styles ', () => {
    const TEMPLATE = '<style> body {\r\n    background-color: #f6f6f6;\r\n  }</style>';
    const buffer = new Parser().parse(TEMPLATE);
    assert.equal(buffer.length, 1);
    assert.equal(buffer[0], '<style> body { background-color: #f6f6f6; }</style>');
  });

  it('should ignore js code ', () => {
    const TEMPLATE = '<script>WebFont.load({google: {"families":["Poppins:300,400,500,600,700"]}});</script>';
    const buffer = new Parser().parse(TEMPLATE);
    assert.equal(buffer.length, 1);
    assert.equal(buffer[0], TEMPLATE);
  });  

  it('should replace reference js code ', () => {
    const TEMPLATE = `
      <script async src="https://www.googletagmanager.com/gtag/js?id={site_config.analytics}"></script>
      <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '{site_config.analytics}');
      </script>`;
    const buffer = new Parser().parse(TEMPLATE);
    assert.equal(buffer.length, 5);
  });  

  it('should ignore comment', () => {
    const TEMPLATE = 'Hello {! comment on hello world !}World!';
    const buffer = new Parser().parse(TEMPLATE);
    assert.equal(buffer.length, 1);
    assert.equal(buffer[0], 'Hello World!');
  });

  it('should ignore comment content', () => {
    const TEMPLATE = 'Hello {! comment {on} hello ! world !}World!';
    const buffer = new Parser().parse(TEMPLATE);
    assert.equal(buffer.length, 1);
    assert.equal(buffer[0], 'Hello World!');
  });

  it('should ignore multilines comments', () => {
    const TEMPLATE = 'Hello {! comment on\nhello world\n !}World!';
    const buffer = new Parser().parse(TEMPLATE);
    assert.equal(buffer.length, 1);
    assert.equal(buffer[0], 'Hello World!');
  });

  it('should ignore two comments and keep content', () => {
    const TEMPLATE = 'Hello {! comment 1 !}World!{! comment 2 !}';
    const buffer = new Parser().parse(TEMPLATE);
    assert.equal(buffer.length, 1);
    assert.equal(buffer[0], 'Hello World!');
  });

  it('should parse multiple references', () => {
    const TEMPLATE = 'Hello {world}, ok. {world}{world}';
    const buffer = new Parser().parse(TEMPLATE);
    assert.equal(buffer.length, 5);
    assert.equal(buffer[0], 'Hello ');
    assert.equal(buffer[1].type, 'r');
    assert.equal(buffer[1].tag, 'world');
    assert.equal(buffer[1].f[0], 'h');
    assert.equal(buffer[2], ', ok. ');
    assert.equal(buffer[3].tag, 'world');
    assert.equal(buffer[4].tag, 'world');
  });

  it('should handle tag error', () => {
    const TEMPLATE = 'Hello {world ok.';
    try {
      new Parser().parse(TEMPLATE);
    } catch(err) {
      assert.equal(err.message, 'Missing closing "}" at index 7');
    }
  });

  it('should parse opening and closing tags', () => {
    const TEMPLATE = 'Hello {?tag}World{/tag}, ok.';
    const buffer = new Parser().parse(TEMPLATE);
    assert.equal(buffer.length, 3);
    assert.equal(buffer[0], 'Hello ');
    assert.equal(buffer[1].type, '?');
    assert.equal(buffer[1].buffer.length, 1);
    assert.equal(buffer[2], ', ok.');
  });

  it('should parse filters', () => {
    const TEMPLATE = 'Hello {name|reverse|uppercase|urlencode}, ok.';
    const buffer = new Parser().parse(TEMPLATE);
    assert.equal(buffer.length, 3);
    assert.equal(buffer[1].tag, 'name');
    assert.equal(buffer[1].f.length, 4);
    assert.equal(buffer[1].f[2], 'urlencode');
    assert.equal(buffer[1].f[3], 'h');
  });

  it('should parse nested tags', () => {
    const TEMPLATE = '{?tag}Hello {?tag}World{/tag}{/tag}, ok.';
    const buffer = new Parser().parse(TEMPLATE);
    assert.equal(buffer.length, 2);
    const nested = buffer[0];
    assert.equal(nested.type, '?');
    assert.equal(nested.buffer.length, 2);
    assert.equal(nested.buffer[0], 'Hello ');
    assert.equal(nested.buffer[1].type, '?');
  });

  it('should parse loop tags', () => {
    const TEMPLATE = 'Hello {#worlds}{.name}{/worlds}, ok.';
    const buffer = new Parser().parse(TEMPLATE);
    assert.equal(buffer.length, 3);
    assert.equal(buffer[1].type, '#');
    assert.equal(buffer[1].buffer.length, 1);
  });

  it('should parse nested loop tags', () => {
    const TEMPLATE = 'Hello {#COL1}a{#COL2}b{/COL2} {/COL1}';
    const buffer = new Parser().parse(TEMPLATE);
    assert.equal(buffer.length, 2);
    assert.equal(buffer[1].type, '#');
    assert.equal(buffer[1].buffer.length, 3);
    assert.equal(buffer[1].buffer[1].type, '#');
  });

  it('should parse multiple lines', () => {
    const TEMPLATE = 'Hello \r\n oo {#COL1}a{/COL1} World';
    const buffer = new Parser().parse(TEMPLATE);
    assert.equal(buffer.length, 3);
    assert.equal(buffer[1].type, '#');
    assert.equal(buffer[1].buffer.length, 1);
  });


  it('should parse else tags', () => {
    const TEMPLATE = '{?tag}Hello{:else}World{/tag}, ok.';
    const buffer = new Parser().parse(TEMPLATE);
    assert.equal(buffer.length, 2);
    const nested = buffer[0];
    assert(nested.bodies.else);
    assert.equal(nested.buffer[0], 'Hello');
    assert.equal(nested.bodies.else[0], 'World');
  });

  it('should parse nested tags in else tag', () => {
    const TEMPLATE = '{?tag}Hello{:else}World {name}{/tag}, ok.';
    const buffer = new Parser().parse(TEMPLATE);
    assert.equal(buffer.length, 2);
    const nested = buffer[0];
    assert(nested.bodies.else);
    assert.equal(nested.buffer[0], 'Hello');
    assert.equal(nested.bodies.else[0], 'World ');
    assert.equal(nested.bodies.else[1].type, 'r');
    assert.equal(nested.bodies.else[1].tag, 'name');
  });

  it.skip('should parse many bodies tags', () => {
    const TEMPLATE = '{?tag}Hello{:else}World{:other}Good Bye{/tag}, ok.';
    const buffer = new Parser().parse(TEMPLATE);
    assert.equal(buffer.length, 2);
    const nested = buffer[0];
    assert(nested.bodies.else);
    assert.equal(nested.buffer[0], 'Hello');
    assert.equal(nested.bodies.else[0], 'World');
    assert.equal(nested.bodies.other[0], 'Good Bye');
  });

  it('should parse ^ tags', () => {
    const TEMPLATE = 'Hello {^tag}World{/tag}, ok.';
    const buffer = new Parser().parse(TEMPLATE);
    assert.equal(buffer.length, 3);
    assert.equal(buffer[0], 'Hello ');
    assert.equal(buffer[1].type, '^');
    assert.equal(buffer[1].buffer.length, 1);
    assert.equal(buffer[2], ', ok.');
  });

  it('should parse @eq tag with params', () => {
    const TEMPLATE = 'Hello {@eq key="key" value=value}World{/eq}, ok.';
    const buffer = new Parser().parse(TEMPLATE);
    assert.equal(buffer.length, 3);
    assert.equal(buffer[0], 'Hello ');
    assert.equal(buffer[1].type, '@');
    assert.equal(buffer[1].tag, 'eq');
    assert.equal(buffer[1].params.key, '"key"');
    assert.equal(buffer[1].params.value, 'value');
    assert.equal(buffer[1].buffer.length, 1);
  });

  it('should parse included file', () => {
    const TEMPLATE = ' Hello {> "./templates/_world" /} !';
    const buffer = new Parser().parse(TEMPLATE);
    assert.equal(buffer.length, 3);
    assert.equal(buffer[1].type, '>');
    assert.equal(buffer[1].file, '"./templates/_world"');
  });

  it('should crash if include tag is not closed', () => {
    const TEMPLATE = ' Hello {> "./templates/_world" } !';
    try {
      new Parser().parse(TEMPLATE);
    } catch(err) {
      assert.equal(err.message, 'Missing closing tag for {>...');
    }
  });

  it('should parse included file with body', () => {
    const TEMPLATE = ' Hello {> "./templates/_world"}world{/>} !';
    const buffer = new Parser().parse(TEMPLATE);
    assert.equal(buffer.length, 3);
    assert.equal(buffer[1].type, '>');
    assert.equal(buffer[1].file, '"./templates/_world"');
    assert.equal(buffer[1].buffer[0], 'world');
  });


  it('should parse included file without leading space', () => {
    const TEMPLATE = ' Hello {>"./templates/_world" /} !';
    const buffer = new Parser().parse(TEMPLATE);
    assert.equal(buffer.length, 3);
    assert.equal(buffer[1].type, '>');
    assert.equal(buffer[1].file, '"./templates/_world"');
  });

  it('should parse tag with params with spaces', () => {
    const TEMPLATE = 'Hello {> "./templates/_world" text="hello world" /}';
    const buffer = new Parser().parse(TEMPLATE);
    assert.equal(buffer.length, 2);
    assert.equal(buffer[1].type, '>');
    assert.equal(buffer[1].file, '"./templates/_world"');
    assert.equal(buffer[1].params.text, '"hello world"');
  });

  it('should parse tag with params with special chars', () => {
    const TEMPLATE = 'Hello {> "./templates/_world" text="hello=/.\'_$world" /}';
    const buffer = new Parser().parse(TEMPLATE);
    assert.equal(buffer.length, 2);
    assert.equal(buffer[1].type, '>');
    assert.equal(buffer[1].file, '"./templates/_world"');
    assert.equal(buffer[1].params.text, '"hello=/.\'_$world"');
  });

  it('should parse include tag with params', () => {
    const TEMPLATE = ' Hello {> "./templates/_world_ref" string="str" reference=ref /} ...';
    const buffer = new Parser().parse(TEMPLATE);
    assert.equal(buffer.length, 3);
    assert.equal(buffer[1].type, '>');
    assert.equal(buffer[1].params.string, '"str"');
    assert.equal(buffer[1].params.reference, 'ref');
  });

  it('should parse layout tag', () => {
    const TEMPLATE = ' {> "./templates/layout" /} {<content}World{/content} ';
    const buffer = new Parser().parse(TEMPLATE);
    assert.equal(buffer.length, 3);
    // const content = buffer[1];
    assert.equal(buffer[0].type, '>');
    assert.equal(buffer[2].type, '<');
  });

  it('should helper tag without out', () => {
    const TEMPLATE = 'Hello {@date date=date format="DD/MM/YYYY" /}{?tag}!{/tag}';
    const buffer = new Parser().parse(TEMPLATE);
    assert.equal(buffer.length, 3);
    let nested = buffer[1];
    assert.equal(nested.selfClosedTag, true);
    assert.equal(nested.params.date, 'date');
    assert.equal(nested.params.format, '"DD/MM/YYYY"');
    nested = buffer[2];
    assert.equal(nested.buffer[0], '!');
  });

  it('should remove spaces at the beginning of lines and eol', () => {
    const TEMPLATE = '  <ul>\n\t<li>  Hello</li>  \n\n\t <li>World  </li>    \n    ';
    const buffer = new Parser().parse(TEMPLATE);
    assert.equal(buffer.length, 1);
    assert.equal(buffer[0], '<ul><li>  Hello</li><li>World  </li>');
  });

  it('should preserve spaces in multi-line HTML attributes', () => {
    const TEMPLATE = '<a \n  href="{href}" \n  class="btn">Link</a>';
    const buffer = new Parser().parse(TEMPLATE);
    assert.equal(buffer.length, 3);
    // Check that spaces are normalized to single space
    assert.equal(buffer[0], '<a href="');  // Spaces normalized
    assert.equal(buffer[1].tag, 'href');    // Reference tag
    assert.equal(buffer[2], '" class="btn">Link</a>');  // Spaces normalized
  });

  // Whitespace handling rules
  it('should preserve multiple spaces in middle of line', () => {
    const TEMPLATE = 'Hello  World';
    const buffer = new Parser().parse(TEMPLATE);
    assert.equal(buffer.length, 1);
    assert.equal(buffer[0], 'Hello  World');  // 2 spaces preserved
  });

  it('should normalize end of line + start of line to single space', () => {
    const TEMPLATE = 'Hello   \n    World';
    const buffer = new Parser().parse(TEMPLATE);
    assert.equal(buffer.length, 1);
    assert.equal(buffer[0], 'Hello World');  // Normalized to 1 space
  });

  it('should remove whitespace between HTML tags', () => {
    const TEMPLATE = '<div>   \n    <span>Text</span>   \n    </div>';
    const buffer = new Parser().parse(TEMPLATE);
    assert.equal(buffer.length, 1);
    assert.equal(buffer[0], '<div><span>Text</span></div>');  // All whitespace between tags removed
  });

  it('should trim leading and trailing whitespace from template', () => {
    const TEMPLATE = '  \n  Template content  \n  ';
    const buffer = new Parser().parse(TEMPLATE);
    assert.equal(buffer.length, 1);
    assert.equal(buffer[0], 'Template content');  // Trimmed
  });

  it('should preserve simple spaces between inline tags', () => {
    const TEMPLATE = '<span>Hello</span> <span>World</span>';
    const buffer = new Parser().parse(TEMPLATE);
    assert.equal(buffer.length, 1);
    assert.equal(buffer[0], '<span>Hello</span> <span>World</span>');  // Space preserved
  });

  it('should parse params with curly braces', () => {
    const TEMPLATE = ' {> "./includes/{file}" text="ok-{test}" /} ';
    const buffer = new Parser().parse(TEMPLATE);
    assert.equal(buffer.length, 1);
    assert.equal(buffer[0].type, '>');
    assert.equal(buffer[0].file, '"./includes/{file}"');
    assert.equal(buffer[0].params.text, '"ok-{test}"');
  });

  it('should allow line returns in tags', () => {
    const TEMPLATE  = 'Hello {> "./test/templates/_world_ref" world=w\n  index=1\nid=1 /}';
    const buffer = new Parser().parse(TEMPLATE);
    assert.equal(buffer.length, 2);
    assert(buffer[1].params.world, 'w');
    assert(buffer[1].params.index, '1');
    assert(buffer[1].params.id, '1');
  });

  it('should detect self closed tag with string param', () => {
    const TEMPLATE = 'Hello {#world params="value" /}';
    const buffer = new Parser().parse(TEMPLATE);
    assert.equal(buffer.length, 2);
    assert.equal(buffer[1].type, '#');
    assert(!buffer[1].buffer);
    assert(buffer[1].selfClosedTag);
    assert(buffer[1].params.params, '"value"');
  });

  it('should detect self closed tag with reference param', () => {
    const TEMPLATE = 'Hello {#t key="dashboard.workshops.workshop" context=site/}';
    const buffer = new Parser().parse(TEMPLATE);
    assert.equal(buffer.length, 2);
    assert.equal(buffer[1].type, '#');
    assert(!buffer[1].buffer);
    assert(buffer[1].selfClosedTag);
    assert(buffer[1].params.key, '"dashboard.workshops.workshop"');
    assert(buffer[1].params.context, 'site');
  });

  it('should parse nested blocks in else block', () => {
    const TEMPLATE = `
      {?companies}
        Aucune
      {:else}
        <select name="company_id" id="company_id" class="form-control" data-value="{?flash.form.company_id}{flash.form.company_id}{:else}{prefilled.company_id}{/flash.form.company_id}">
          {#companies}
            <option value="{.id}">{.name}</option>
          {/companies}
        </select>
      {/companies}`;
    const buffer = new Parser().parse(TEMPLATE);
    assert.equal(buffer.length, 1);
    assert.equal(buffer[0].type, '?');
    assert.equal(buffer[0].buffer.length, 1);
    assert.equal(buffer[0].bodies.else.length, 5);
  });

  it('should parse insert tags', () => {
    const TEMPLATE = '<meta name="description" content="{+description/}">';
    const buffer = new Parser().parse(TEMPLATE);
    assert.equal(buffer.length, 3);
    assert.equal(buffer[1].type, '+');
    assert.equal(buffer[1].tag, 'description');
  });

  
});
