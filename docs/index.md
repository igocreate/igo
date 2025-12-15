# Igo.js

![Build Status](https://github.com/igocreate/igo/actions/workflows/node.js.yml/badge.svg)

## Introduction

Igo.js is a full-featured Node.js web framework that gives you a production-ready application with a complete development environment in seconds.

Built on top of Express 5, Igo.js integrates the most popular Node.js libraries and tools: Vite for asset bundling, an ORM for MySQL/PostgreSQL, Redis caching, Mocha for testing, and more.

## Packages

Igo.js is organized as a monorepo with the following packages:

| Package | Description |
|---------|-------------|
| **@igo/server** | Express-based web framework with routing, forms, cache, mailer, CLI |
| **@igo/db** | Database ORM for MySQL and PostgreSQL with Active Record pattern |
| **@igo/dust** | JavaScript template engine inspired by Dust.js |
| **@igo/signal** | Reactive frontend/SSR framework with automatic dependency tracking |

## Getting started

```sh
# Install igo.js globally for CLI commands
npm install -g igo

# Create new project
igo create myproject
cd myproject

# Install dependencies
npm install

# Start the server on http://localhost:3000
npm start
```

## Configuration

The Igo.js configuration is located in `/app/config.js`.
The configuration is initialized at startup, and can be retrieved through igo module:

```js
const config = require('igo').config;
```

Some configuration parameters can be defined with environment variables. Igo.js uses [dotenv](https://github.com/motdotla/dotenv), so you can add/override variables in the `/.env` file:

```txt
# Development database
MYSQL_DATABASE=mydatabase

# Redis
REDIS_HOST=localhost
```

## Project Structure

A typical Igo.js project:

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

---
