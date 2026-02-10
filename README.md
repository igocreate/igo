# Igo.js

![Build Status](https://github.com/igocreate/igo/actions/workflows/node.js.yml/badge.svg)

Igo is a full-stack web framework for Node.js, built on Express 5. It provides everything you need to build server-rendered web applications with reactive frontend components:

- **ORM** for MySQL and PostgreSQL with Active Record-style API, associations, Redis caching, and migrations
- **Template engine** (Dust-inspired) with async/await rendering and Express integration
- **Reactive frontend** with deep reactivity via Proxy, SSR with hydration, and DiffDOM reconciliation
- **Express 5 framework** with file-based routing, form validation, i18n, email (Nodemailer + MJML), and CLI scaffolding

All remarks, suggestions, PRs are welcome!

## Packages

Igo is an npm monorepo composed of 5 packages:

| Package | Description |
|---------|-------------|
| **[@igojs/igo](packages/igo/)** | Meta-package that installs the full framework |
| **[@igojs/server](packages/server/)** | Express 5 framework core: routing, config, validation, i18n, email, CLI |
| **[@igojs/db](packages/db/)** | ORM for MySQL and PostgreSQL: query builder, associations, migrations, Redis caching |
| **[@igojs/dust](packages/dust/)** | Template engine with async rendering and browser bundle |
| **[@igojs/signal](packages/signal/)** | Reactive frontend/SSR: deep reactivity, hydration, two-way binding |

## Getting Started

Before using Igo, you need to install Node.js (>=22.x).
Then, create a new project with:

```sh
npx @igojs/server create myproject
cd myproject
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000) and start coding (and reading [the docs](/docs/README.md)).

Type ```npx mocha``` to run tests.

## Documentation

[Check our website](https://igocreate.github.io/igo/)

## Development

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run specific package tests
npm run test:db
npm run test:dust
npm run test:server
npm run test:signal

# Lint
npm run eslint
```

## License

ISC
