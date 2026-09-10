require('./init');

const assert = require('assert');
const fs     = require('fs');
const os     = require('os');
const path   = require('path');

const create = require('@igojs/server/cli/create');

const SKELETONS = ['tailwind', 'fullstack'];

describe('cli/create', function() {
  this.timeout(20000);

  let cwd, tmp;

  beforeEach(() => {
    cwd = process.cwd();
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'igo-create-'));
    process.chdir(tmp);
  });

  afterEach(() => {
    process.chdir(cwd);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  SKELETONS.forEach((skel) => {
    it(`should create a project from the ${skel} skeleton`, async () => {
      await create({ _: ['create', 'myapp'], skel });

      const pkg = JSON.parse(fs.readFileSync(path.join(tmp, 'myapp', 'package.json'), 'utf8'));
      assert(pkg.name.startsWith('myapp'), `project name was not substituted: ${pkg.name}`);
      assert(!/\{[a-z.]+\}/.test(JSON.stringify(pkg)), 'a placeholder was left unreplaced');

      // _.gitignore is renamed on the way out
      assert(fs.existsSync(path.join(tmp, 'myapp', '.gitignore')));
    });
  });

  it('should default to the tailwind skeleton', async () => {
    await create({ _: ['create', 'myapp'] });
    assert(fs.existsSync(path.join(tmp, 'myapp', 'views')), 'tailwind skeleton has views');
  });

  it('should carry the api conventions into the api skeleton', async () => {
    await create({ _: ['create', 'myapi'], skel: 'fullstack' });

    const routes = fs.readFileSync(path.join(tmp, 'myapi', 'api', 'app', 'routes.ts'), 'utf8');
    assert(routes.includes('app.api('), 'routes mount through app.api()');

    const controller = fs.readFileSync(
      path.join(tmp, 'myapi', 'api', 'app', 'features', 'books', 'books.controller.ts'), 'utf8');
    assert(controller.includes('create.body = dto.CreateBook'),
           'schema is attached to the handler');
    assert(controller.includes('\'/problems/book-not-found\''),
           'business errors carry their own problem type');
  });

  it('should ship migrations and seeds in the api skeleton', async () => {
    await create({ _: ['create', 'myapi'], skel: 'fullstack' });

    const pkg = JSON.parse(
      fs.readFileSync(path.join(tmp, 'myapi', 'api', 'package.json'), 'utf8'));
    assert(pkg.scripts.migrate, 'migrate script');
    // the seeds import the TS models, so the CLI needs the tsx loader
    assert(pkg.scripts.seed.includes('tsx'), `seed runs under tsx: ${pkg.scripts.seed}`);

    assert(fs.existsSync(path.join(tmp, 'myapi', 'api', 'seeds', '001-books.ts')));
  });
});
