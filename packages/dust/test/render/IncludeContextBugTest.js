/* global describe, it */

// {+/} in a partial must consume only the body of THAT include, never the body
// of an enclosing one — otherwise it can re-invoke that body in the wrong scope.

const assert    = require('assert');

const Renderer  = require('../../src/render/Renderer');

describe('{+/} body leak across includes', () => {

  it('a partial called without a body must not steal the enclosing body', async () => {
    // post.dust includes tag.dust (no body) BEFORE its own {+/} body slot.
    // tag.dust contains its own {+/} — that one must render empty, not the
    // body intended for post's body slot.
    const main = '{> "./test/templates/blog/post" title="Hello"}Hello World{/>}';
    const r = await new Renderer().render(main);
    assert.equal(
      r,
      '<article class="post"><header><span class="tag"></span><h1>Hello</h1></header>' +
      '<section class="body">Hello World</section></article>'
    );
  });

  it('each loop iteration\'s body lands in its own post', async () => {
    const main = '{#posts}{> "./test/templates/blog/post" title=.title}{.body}{/>}{/posts}';
    const r = await new Renderer().render(main, {
      posts: [
        { title: 'First',  body: 'one'   },
        { title: 'Second', body: 'two'   },
        { title: 'Third',  body: 'three' },
      ],
    });
    assert.equal(
      r,
      '<article class="post"><header><span class="tag"></span><h1>First</h1></header>'  +
      '<section class="body">one</section></article>' +
      '<article class="post"><header><span class="tag"></span><h1>Second</h1></header>' +
      '<section class="body">two</section></article>' +
      '<article class="post"><header><span class="tag"></span><h1>Third</h1></header>'  +
      '<section class="body">three</section></article>'
    );
  });

  it('a {+/} inside a nested loop must not re-invoke the body with a corrupted l._it', async () => {
    // Matches the original report. The post body is a dynamic include that
    // reads l._it.widget. Without scoping, the {+/} inside comments.dust's
    // {#comments} loop re-invokes the outer body with l._it = current comment,
    // l._it.widget = undefined, → u.i('.../.dust') → ENOENT.
    const main = '{#posts}{> "./test/templates/blog/post" title=.title}'
               + '{> "./test/templates/blog/{.widget}" comments=.comments /}{/>}{/posts}';
    const posts = [{ title: 'Article', widget: 'comments', comments: [{ author: 'Alice' }] }];
    const r = await new Renderer().render(main, { posts });
    assert.equal(
      r,
      '<article class="post"><header><span class="tag"></span><h1>Article</h1></header>' +
      '<section class="body"><ul class="comments"><li class="comment"></li></ul></section></article>'
    );
  });

});
