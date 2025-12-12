const assert = require('assert');
const Renderer = require('../../src/render/Renderer');

describe('Documentation Examples - Basics', function () {

  it('should handle nested object access', async () => {
    const template = '{user.profile.address.city}, {user.profile.address.country}';
    const data = {
      user: {
        profile: {
          address: {
            city: 'Paris',
            country: 'France'
          }
        }
      }
    };
    const result = await new Renderer().render(template, data);
    assert.equal(result, 'Paris, France');
  });

  it('should handle dynamic property access', async () => {
    const template = '{products[category][selectedId].name}';
    const data = {
      category: 'electronics',
      selectedId: 'laptop123',
      products: {
        electronics: {
          laptop123: { name: 'MacBook Pro' }
        }
      }
    };
    const result = await new Renderer().render(template, data);
    assert.equal(result, 'MacBook Pro');
  });

});

describe('Documentation Examples - Filters', function () {

  it('should display user-generated content safely (HTML-encoded by default)', async () => {
    const template = '<div class="comment">{comment.text}</div>';
    const data = {
      comment: {
        text: '<script>alert("XSS")</script>Safe comment'
      }
    };
    const result = await new Renderer().render(template, data);
    assert.equal(result, '<div class="comment">&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;Safe comment</div>');
  });

  it('should build URLs with encoding', async () => {
    const template = '<a href="/search?q={query|uc}">Search for {query}</a>';
    const data = {
      query: 'hello world & more'
    };
    const result = await new Renderer().render(template, data);
    assert.equal(result, '<a href="/search?q=hello%20world%20%26%20more">Search for hello world &amp; more</a>');
  });

  it('should display rich HTML content with |s filter', async () => {
    const template = '<article>{content|s}</article>';
    const data = {
      content: '<h1>Title</h1><p>Rich <strong>HTML</strong> content</p>'
    };
    const result = await new Renderer().render(template, data);
    assert.equal(result, '<article><h1>Title</h1><p>Rich <strong>HTML</strong> content</p></article>');
  });

  it('should prepare data for JavaScript with |js filter', async () => {
    const template = 'const userData = {data|js|s};';
    const data = {
      data: { name: "O'Brien", age: 30 }
    };
    const result = await new Renderer().render(template, data);
    assert.equal(result, 'const userData = {"name":"O\'Brien","age":30};');
  });

});

describe('Documentation Examples - Helpers', function () {

  it('should display product prices with comparison (@gt helper)', async () => {
    const template = `<div class="product">
  <h3>{product.name}</h3>
  <p class="price">$\{product.price}</p>
  {@gt key=product.price value=100}
    <span class="badge">Premium</span>
  {:else}
    <span class="badge">Affordable</span>
  {/gt}
</div>`;
    const data = {
      product: {
        name: 'Laptop',
        price: 1299
      }
    };
    const result = await new Renderer().render(template, data);
    assert(result.includes('<h3>Laptop</h3>'));
    assert(result.includes('<p class="price">$1299</p>'));
    assert(result.includes('<span class="badge">Premium</span>'));
    assert(!result.includes('Affordable'));
  });

  it('should show user status indicator (@eq helper)', async () => {
    const template = `<div class="user-status">
  {@eq key=user.status value="online"}
    <span class="dot green"></span> Online
  {/eq}
  {@eq key=user.status value="away"}
    <span class="dot yellow"></span> Away
  {/eq}
  {@eq key=user.status value="offline"}
    <span class="dot gray"></span> Offline
  {/eq}
</div>`;
    const data = {
      user: {
        status: 'away'
      }
    };
    const result = await new Renderer().render(template, data);
    assert(result.includes('<span class="dot yellow"></span> Away'));
    assert(!result.includes('Online'));
    assert(!result.includes('Offline'));
  });

  it('should filter age-based content (@gte helper)', async () => {
    const template = `{@gte key=user.age value=18}
  <a href="/adult-content">View all content</a>
{:else}
  <p>Content restricted. You must be 18 or older.</p>
{/gte}`;
    const data = {
      user: {
        age: 16
      }
    };
    const result = await new Renderer().render(template, data);
    assert(result.includes('Content restricted. You must be 18 or older.'));
    assert(!result.includes('View all content'));
  });

});

describe('Documentation Examples - Loops', function () {

  it('should build a product list with pricing', async () => {
    const template = `<ul class="products">
{#products}
  <li>
    <strong>{.name}</strong> - $\{.price}
    {?.onSale}
      <span class="badge">SALE!</span>
    {/.onSale}
  </li>
  {@sep}<hr/>{/sep}
{/products}
</ul>`;
    const data = {
      products: [
        { name: 'Laptop', price: 999, onSale: true },
        { name: 'Mouse', price: 29, onSale: false },
        { name: 'Keyboard', price: 79, onSale: true }
      ]
    };
    const result = await new Renderer().render(template, data);
    assert(result.includes('<strong>Laptop</strong> - $999'));
    assert(result.includes('<span class="badge">SALE!</span>'));
    assert(result.includes('<strong>Mouse</strong> - $29'));
    assert(result.includes('<strong>Keyboard</strong> - $79'));
    assert(result.match(/<hr\/>/g).length === 2); // 2 separators for 3 items
  });

  it('should display a table with row numbers using $idx', async () => {
    const template = `<table>
  <thead>
    <tr><th>#</th><th>Name</th><th>Email</th></tr>
  </thead>
  <tbody>
  {#users it="user"}
    <tr>
      <td>{$idx}</td>
      <td>{user.name}</td>
      <td>{user.email}</td>
    </tr>
  {/users}
  </tbody>
</table>`;
    const data = {
      users: [
        { name: 'Alice', email: 'alice@example.com' },
        { name: 'Bob', email: 'bob@example.com' },
        { name: 'Charlie', email: 'charlie@example.com' }
      ]
    };
    const result = await new Renderer().render(template, data);
    assert(result.includes('<td>0</td>'));
    assert(result.includes('<td>1</td>'));
    assert(result.includes('<td>2</td>'));
    assert(result.includes('<td>Alice</td>'));
    assert(result.includes('<td>alice@example.com</td>'));
    assert(result.includes('<td>Bob</td>'));
    assert(result.includes('<td>Charlie</td>'));
  });

  it('should create navigation menu with active state', async () => {
    const template = `<nav>
  <ul>
  {#menu it="item"}
    <li class="{@eq key=item.id value=currentPage}active{/eq}">
      <a href="{item.url}">{item.label}</a>
    </li>
  {/menu}
  </ul>
</nav>`;
    const data = {
      currentPage: 'about',
      menu: [
        { id: 'home', label: 'Home', url: '/' },
        { id: 'about', label: 'About', url: '/about' },
        { id: 'contact', label: 'Contact', url: '/contact' }
      ]
    };
    const result = await new Renderer().render(template, data);
    assert(result.includes('<li class="active">'));
    assert(result.includes('<a href="/about">About</a>'));
    // Verify other items don't have active class
    const homeMatch = result.match(/<li class="">[\s\S]*?<a href="\/">Home<\/a>/);
    const contactMatch = result.match(/<li class="">[\s\S]*?<a href="\/contact">Contact<\/a>/);
    assert(homeMatch);
    assert(contactMatch);
  });

});
