
# Migrations

## SQL Files

SQL migration files are placed in the `sql/` directory (or `sql/{database_name}/` for multi-database setups). They are executed in alphabetical order.

File names must follow the pattern `YYYYMMDD*.sql`:

```
sql/
├── 20240110001_create_users.sql
├── 20240115001_create_projects.sql
└── 20240201001_add_email_to_users.sql
```

Each file can contain multiple SQL statements separated by `;`. Lines starting with `--` are treated as comments and ignored. Hidden files (`.gitkeep`, etc.) are skipped.

### Example

```sql
-- sql/20240110001_create_users.sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  settings JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
```

## Running Migrations

### CLI

```bash
# Run pending migrations (from terminal)
npx igo db migrate

# List migration history
npx igo db migrations

# Reset database (interactive confirmation required)
npx igo db reset
```

### Programmatic

Migrations run automatically at startup if `config.auto_migrate` is enabled. Otherwise:

```js
const db = require('@igojs/db');
await db.migrations.migrate(db.dbs.main);
```

## Migration Tracking

Executed migrations are tracked in a `__db_migrations` table, created automatically by the framework. Each entry records:
- Migration filename
- Success status
- Execution timestamp

A migration that has run successfully will not run again.

Concurrent migration runs are prevented via advisory locks (MySQL `GET_LOCK()` / PostgreSQL `pg_try_advisory_lock()`).
