
// Loads the .env and nothing else, for code that must run before igo — an
// OpenTelemetry instrumentation file, which has to precede express and mysql2
// but reads OTEL_* variables that igo's configuration has not loaded yet.
// Importing igo instead would load what it was meant to precede. Calling
// dotenv twice is harmless: it never overrides a variable already set.
//
// Same rule as src/config.js: in production the environment is the source.
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ quiet: true });
}
