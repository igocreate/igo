---
layout: home

hero:
  name: Igo.js
  text: Full-stack Node.js Web Framework
  tagline: Built on Express 5 — ORM, templates, reactive frontend, all included.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/development
    - theme: alt
      text: GitHub
      link: https://github.com/igocreate/igo

features:
  - title: '@igojs/server'
    details: Express 5 framework with file-based routing, form validation, i18n, email, Redis caching, and CLI scaffolding.
    link: /server/controllers
    linkText: Server docs
  - title: '@igojs/db'
    details: Active Record-style ORM for MySQL and PostgreSQL with query builder, associations, and migrations.
    link: /db/models
    linkText: Database docs
  - title: '@igojs/dust'
    details: Async template engine with partials, helpers, filters, and Express integration.
    link: /dust/getting-started
    linkText: Dust docs
  - title: '@igojs/component'
    details: Reactive frontend with deep reactivity via Proxy, SSR with hydration, and DiffDOM-based DOM reconciliation.
    link: /component/components
    linkText: Component docs
---

## Getting Started

```sh
npx @igojs/server create myproject
cd myproject
npm install
npm start
```

Open `http://localhost:3000` and start coding.

## Configuration

The configuration is located in `/app/config.js` and initialized at startup:

```js
const config = require('@igojs/server').config;
```

Environment variables can be defined in a `.env` file (loaded via [dotenv](https://github.com/motdotla/dotenv)):

```txt
MYSQL_DATABASE=mydatabase
REDIS_HOST=localhost
```

## Project Structure

```
myproject/
├── app/
│   ├── config.js       # Configuration
│   ├── routes.js       # Route definitions
│   ├── controllers/    # Request handlers
│   ├── models/         # Database models
│   └── helpers.js      # View helpers
├── views/              # Dust templates
├── public/             # Static assets
├── sql/                # Database migrations
├── locales/            # i18n translations
├── test/               # Test files
└── .env                # Environment variables
```
