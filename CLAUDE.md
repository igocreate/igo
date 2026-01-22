# CLAUDE.md - Igo.js Framework

## Project Overview

Igo is a Node.js full-stack web framework built on Express, providing ORM, templating, and reactive frontend components. This is an **npm monorepo** with 5 packages.

**Version:** 6.0.0
**License:** ISC
**Repository:** github.com/igocreate/igo
**Node.js:** >=22.x (see `.nvmrc`)

## Project Structure

```
/
├── packages/                    # Monorepo packages
│   ├── db/                     # @igojs/db - ORM and database abstraction
│   ├── dust/                   # @igojs/dust - Template engine
│   ├── igo/                    # @igojs/igo - Meta-package (dépend de tous les autres)
│   ├── server/                 # @igojs/server - Express framework core
│   └── signal/                 # @igojs/signal - Reactive frontend/SSR
├── docs/                       # Docsify documentation
├── package.json                # Root workspace configuration
└── CHANGELOG.md                # Version history
```

## Packages

### @igojs/db (Database Layer)
- Active Record-style ORM supporting MySQL and PostgreSQL
- Query builder with chainable API
- Associations (has_many, belongs_to)
- Redis caching support
- SQL migrations
- **Entry:** `packages/db/src/index.js`

### @igojs/dust (Template Engine)
- JavaScript template engine (Dust.js-inspired)
- Async/await rendering
- Express.js view engine integration
- Browser bundle available
- **Entry:** `packages/dust/src/index.js`
- **Browser build:** `packages/dust/dist/igo-dust-6.0.0-min.js`

### @igojs/server (Core Framework)
- Express 5 integration
- Configuration management (dotenv)
- File-based controller routing
- Form handling with validation
- i18next internationalization
- Redis caching, email (nodemailer + MJML)
- CLI for scaffolding and database commands
- **Entry:** `packages/server/src/index.js`
- **CLI:** `packages/server/cli/igo.js`

### @igojs/signal (Reactive Frontend)
- Deep reactivity via JavaScript Proxy
- Automatic dependency tracking
- SSR with hydration
- DiffDOM-based DOM reconciliation
- Two-way form binding
- **Entry:** `packages/signal/src/index.js`

## Key Technologies

- **Backend:** Express 5, Node.js
- **Build:** Vite (replaced Webpack in v6)
- **Database:** MySQL2, PostgreSQL (pg)
- **Caching:** Redis
- **Testing:** Mocha
- **Templating:** Dust (custom implementation)
- **CSS:** Sass, PostCSS, Autoprefixer
- **i18n:** i18next
- **Email:** Nodemailer, MJML

## Common Commands

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

# Build dust browser bundle
npm run build:dust
```

## Code Style

- ESLint configured (`.eslintrc.json`)
- 2-space indentation
- Single quotes
- Semicolons required
- Strict mode

## Architecture Notes

### Signal Component Flow
```
Props → State (reactive via Proxy) → Derived (computed) → Template → DOM
```

### Database Query Pattern
```javascript
const users = await User.query().where({ active: true }).all();
```

### Template Rendering
```javascript
res.render('template', { data });
```

## Current Branch

- **Development:** `v6` (current)
- **Main:** `master`

## Versioning

Le package principal `@igojs/igo` (`packages/igo/`) est un meta-package qui dépend de tous les autres packages :

```
@igojs/igo
├── @igojs/db
├── @igojs/dust
├── @igojs/server
└── @igojs/signal
```

**Lors d'une mise à jour de version d'un package :**

1. Mettre à jour la version dans `packages/<package>/package.json`
2. Mettre à jour la dépendance correspondante dans `packages/igo/package.json`
3. Lancer `npm install` pour synchroniser `package-lock.json`

## Important Files

| File | Purpose |
|------|---------|
| `packages/*/package.json` | Package configurations |
| `.mocharc.js` | Mocha test config |
| `.eslintrc.json` | ESLint rules |
| `packages/dust/vite.config.js` | Dust browser build config |
| `packages/server/cli/igo.js` | CLI entry point |
