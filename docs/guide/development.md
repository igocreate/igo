
# Development

## npm Scripts

The default `npm start` script runs two processes in parallel:
- **nodemon** to start the server and restart on file changes
- **webpack** to compile frontend assets with hot reload

```json
{
  "scripts": {
    "eslint": "eslint ./src ./test ./app ./cli",
    "nodemon": "nodemon app.js",
    "start": "concurrently \"npm run nodemon\" \"npm run webpack\"",
    "webpack": "webpack serve",
    "test": "mocha"
  }
}
```

## Webpack

Your local `webpack.config.js` can extend the default config provided by Igo:

```js
const webpackConfig = require('@igojs/server').dev.webpackConfig;
module.exports = webpackConfig;
```

The default configuration provides:
- **Entry points:** `./js/main.js` and `./js/vendor.js`
- **Output:** `public/dist/` with content-hash filenames for cache busting
- **SCSS:** Sass compilation with PostCSS and Autoprefixer
- **Assets:** Images, fonts, and media files
- **Dev server:** Port 9000, live reload, file watching on `views/`, `public/`, `scss/`, `js/`
- **Production:** CSS and JS minification

You can override any part of this config in your project.

## Nodemon

Nodemon watches the `app/` directory and restarts the server on changes. You can configure it via `nodemon.json`:

```json
{
  "watch": [
    "app"
  ],
  "ignore": [],
  "ext": "js json",
  "events": {
    "start": "npm run eslint"
  }
}
```

## Configuration

The configuration is loaded from multiple files, in order:

1. `.env` — environment variables (via [dotenv](https://github.com/motdotla/dotenv), dev/test only)
2. `igo.config.js` or `igo.config.cjs` — project-level config
3. `app/config.js` — application config
4. `app/config-{NODE_ENV}.js` — environment-specific overrides

Access the config at runtime:

```js
const config = require('@igojs/server').config;
```

### Key Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `dev` | Environment: `dev`, `test`, `production` |
| `HTTP_PORT` | `3000` | Server port |
| `MYSQL_HOST` | `localhost` | MySQL host |
| `MYSQL_DATABASE` | `igo` | MySQL database name |
| `MYSQL_USER` | `root` | MySQL user |
| `MYSQL_PASSWORD` | — | MySQL password |
| `PG_HOST` | `localhost` | PostgreSQL host |
| `PG_DATABASE` | `igo` | PostgreSQL database name |
| `REDIS_HOST` | `localhost` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `LOG_LEVEL` | `info` | Winston log level |
| `COOKIE_SECRET` | — | Cookie signing secret |
| `COOKIE_SESSION_KEYS` | — | Session encryption keys |
| `SMTP_HOST` | — | SMTP server for emails |
| `SMTP_PORT` | `465` | SMTP port |
| `SMTP_USER` | — | SMTP user |
| `SMTP_PASSWORD` | — | SMTP password |

## CLI

The `igo` CLI is provided by `@igojs/server`. Since it's installed in your project, you can use it directly in npm scripts or via `npx` from the terminal.

### In npm scripts (no `npx` needed)

```json
{
  "scripts": {
    "db:migrate": "igo db migrate",
    "db:reset": "igo db reset",
    "db:seed": "igo db seed"
  }
}
```

### From the terminal

```bash
# Create a new project
npx @igojs/server create myproject

# Database
npx igo db migrate       # Run pending migrations
npx igo db migrations    # List migration status
npx igo db reset         # Reset database (interactive confirmation)
npx igo db seed          # Run seed files from seeds/ directory
npx igo db reseed        # Reset database and run seeds

# i18n
npx igo i18n update      # Update translations from Google Spreadsheet
npx igo i18n csv         # Export translations to CSV

# Interactive console (Node REPL)
npx igo console          # REPL with config, db, models, services, utils preloaded
```

## Interactive Console

`igo console` opens a Node REPL with your project context already wired up — config loaded, database connected, Redis connected (if configured), and all your `app/models/`, `app/services/`, `app/utils/` auto-discovered.

```bash
$ npx igo console
igo console
Available: config, cache, db, dbs, Model, logger
Models: User, Product, elearning.Training
Services: AuthService, PaymentService

igo> await User.where({ email: 'alice@example.com' }).first()
User { id: 1, email: 'alice@example.com', ... }

igo> await Product.count()
142

igo> await AuthService.verifyToken('xyz')
{ valid: true, userId: 1 }
```

Models in subdirectories are namespaced — `app/models/elearning/Training.js` becomes `elearning.Training`. Files that fail to require (missing deps, etc.) are logged as warnings and skipped.

Useful for one-off queries, debugging data issues, or testing service methods without writing a script.
