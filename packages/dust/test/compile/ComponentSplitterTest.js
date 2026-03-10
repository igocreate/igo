const assert = require('assert');
const ComponentSplitter = require('../../src/compile/ComponentSplitter');

describe('ComponentSplitter', () => {

  describe('split', () => {

    it('should split a single-file component into script and template', () => {
      const source = `<script>
{
  props: { count: 0 },
  increment() { this.state.count++; }
}
</script>
<div>
  <p>{count}</p>
</div>`;

      const { scriptSrc, templateSrc } = ComponentSplitter.split(source);

      assert.ok(scriptSrc.includes('props: { count: 0 }'));
      assert.ok(scriptSrc.includes('increment()'));
      assert.ok(templateSrc.includes('<div>'));
      assert.ok(templateSrc.includes('{count}'));
      assert.ok(!templateSrc.includes('<script>'));
    });

    it('should return null scriptSrc for plain dust files', () => {
      const source = `<div><p>Hello {name}</p></div>`;
      const { scriptSrc, templateSrc } = ComponentSplitter.split(source);

      assert.strictEqual(scriptSrc, null);
      assert.strictEqual(templateSrc, source);
    });

    it('should handle empty script block', () => {
      const source = `<script>
{}
</script>
<div></div>`;

      const { scriptSrc, templateSrc } = ComponentSplitter.split(source);

      assert.strictEqual(scriptSrc, '{}');
      assert.ok(templateSrc.includes('<div>'));
    });

    it('should handle getters in script block', () => {
      const source = `<script>
{
  props: { items: [] },
  get count() { return this.props.items.length; }
}
</script>
<div>{count}</div>`;

      const { scriptSrc } = ComponentSplitter.split(source);

      assert.ok(scriptSrc.includes('get count()'));
    });

  });

  describe('rewriteOnEvents', () => {

    it('should rewrite on:click to data-on-click', () => {
      const input = '<button on:click="increment">+1</button>';
      const output = ComponentSplitter.rewriteOnEvents(input);
      assert.strictEqual(output, '<button data-on-click="increment">+1</button>');
    });

    it('should rewrite multiple on:events', () => {
      const input = '<input on:input="onInput" on:focus="onFocus" />';
      const output = ComponentSplitter.rewriteOnEvents(input);
      assert.strictEqual(output, '<input data-on-input="onInput" data-on-focus="onFocus" />');
    });

    it('should not rewrite regular attributes', () => {
      const input = '<div class="test" onclick="bad()">text</div>';
      const output = ComponentSplitter.rewriteOnEvents(input);
      assert.strictEqual(output, input);
    });

    it('should handle on:submit and on:change', () => {
      const input = '<form on:submit="onSubmit"><select on:change="onChange"></select></form>';
      const output = ComponentSplitter.rewriteOnEvents(input);
      assert.ok(output.includes('data-on-submit="onSubmit"'));
      assert.ok(output.includes('data-on-change="onChange"'));
    });

  });

});
