
# Seeds

Seeds populate the database with initial or test data. They are useful for setting up development environments, running demos, or bootstrapping default records.

## Seed Files

Seed files are placed in the `seeds/` directory at the root of your project. File names must follow the pattern `NNN*.js` (numeric prefix):

```
seeds/
├── 001_users.js
├── 002_projects.js
└── 003_tasks.js
```

Files are executed in alphabetical order, so use numeric prefixes to control the sequence.

## Writing Seeds

Each seed file exports an async function:

```js
// seeds/001_users.js
const User = require('../app/models/User');

module.exports = async () => {
  await User.create({ email: 'admin@example.com', first_name: 'Admin' });
  await User.create({ email: 'user@example.com', first_name: 'User' });
};
```

You can use any model method available in the ORM — `create`, `update`, `query`, etc.

## CLI Commands

```bash
# Run all seed files
npx igo db seed

# Reset database and run seeds
npx igo db reseed
```

The `reseed` command first runs `db reset` (which drops and recreates all tables via migrations), then runs all seeds.

::: warning
Seeds cannot be run in production (`NODE_ENV=production`).
:::

## npm Script

You can add a shortcut in your `package.json`:

```json
{
  "scripts": {
    "db:seed": "igo db seed",
    "db:reseed": "igo db reseed"
  }
}
```
