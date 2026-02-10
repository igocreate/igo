# Recommandations pour le futur - @igojs/server

Ce document liste les améliorations futures recommandées pour le package `@igojs/server`, organisées par priorité.

## 🚀 Phase 1 - Court terme (1-2 semaines)

### 1. Tests de couverture
**Priorité: Haute**

Ajouter coverage reporting avec c8:
```bash
npm install --save-dev c8
```

```json
{
  "scripts": {
    "test": "mocha --exit 'test/**/*.js'",
    "test:coverage": "c8 --reporter=lcov --reporter=text npm test"
  }
}
```

Objectif: Minimum 80% de couverture

### 2. Rate Limiting
**Priorité: Haute - Sécurité**

Ajouter protection contre les attaques par force brute:

```bash
npm install express-rate-limit
```

```javascript
// src/connect/rate-limit.js
const rateLimit = require('express-rate-limit');

module.exports = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit par IP
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP'
});
```

### 3. Validation des variables d'environnement
**Priorité: Moyenne**

Créer un module de validation:

```javascript
// src/validate-env.js
const validators = {
  production: {
    required: ['COOKIE_SECRET', 'COOKIE_SESSION_KEYS', 'SMTP_HOST'],
    optional: ['REDIS_HOST', 'MYSQL_HOST']
  },
  development: {
    recommended: ['COOKIE_SECRET']
  }
};

module.exports.validate = (env) => {
  const checks = validators[env] || validators.development;
  
  for (const key of checks.required || []) {
    if (!process.env[key]) {
      throw new Error(`Missing required env var: ${key}`);
    }
  }
  
  for (const key of checks.recommended || []) {
    if (!process.env[key]) {
      console.warn(`⚠️  Recommended env var not set: ${key}`);
    }
  }
};
```

## 📊 Phase 2 - Moyen terme (1 mois)

### 4. Métriques Prometheus
**Priorité: Haute - Observabilité**

```bash
npm install prom-client
```

```javascript
// src/metrics.js
const promClient = require('prom-client');

// Collecter les métriques par défaut
promClient.collectDefaultMetrics();

// Métriques HTTP
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

// Middleware
module.exports.middleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || 'unknown';
    
    httpRequestDuration
      .labels(req.method, route, res.statusCode)
      .observe(duration);
    
    httpRequestTotal
      .labels(req.method, route, res.statusCode)
      .inc();
  });
  
  next();
};

// Endpoint
module.exports.endpoint = async (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
};
```

Utilisation:
```javascript
const metrics = require('./src/metrics');

app.use(metrics.middleware);
app.get('/metrics', metrics.endpoint);
```

### 5. Structured Logging
**Priorité: Moyenne**

Améliorer le logger avec format JSON et contexte de requête:

```javascript
// src/logger.js
const winston = require('winston');
const { AsyncLocalStorage } = require('async_hooks');

const asyncLocalStorage = new AsyncLocalStorage();

const logger = winston.createLogger({
  level: config.loglevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new DailyRotateFile({
      filename: 'logs/app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d'
    })
  ]
});

// Child logger avec contexte de requête
logger.withContext = () => {
  const store = asyncLocalStorage.getStore();
  if (store && store.req) {
    return logger.child({ 
      requestId: store.req.id,
      method: store.req.method,
      url: store.req.originalUrl 
    });
  }
  return logger;
};

module.exports = logger;
```

### 6. Documentation API avec Swagger
**Priorité: Moyenne**

```bash
npm install swagger-jsdoc swagger-ui-express
```

```javascript
// src/swagger.js
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Igo API',
      version: '6.0.0',
      description: 'Igo Framework REST API'
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      }
    ]
  },
  apis: ['./app/routes/**/*.js']
};

const swaggerSpec = swaggerJsdoc(options);

module.exports.setup = (app) => {
  app.use('/api-docs', swaggerUi.serve);
  app.get('/api-docs', swaggerUi.setup(swaggerSpec));
};
```

Dans les routes:
```javascript
/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: List of users
 */
app.get('/api/users', async (req, res) => {
  // ...
});
```

## 🔮 Phase 3 - Long terme (3+ mois)

### 7. OpenTelemetry Tracing
**Priorité: Moyenne - Observabilité avancée**

```bash
npm install @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node
```

```javascript
// src/tracing.js
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

const sdk = new NodeSDK({
  instrumentations: [getNodeAutoInstrumentations()],
});

module.exports.init = () => {
  sdk.start();
};

module.exports.shutdown = async () => {
  await sdk.shutdown();
};
```

### 8. WebSocket Support
**Priorité: Basse - Feature**

```bash
npm install socket.io
```

```javascript
// src/websocket.js
const socketIo = require('socket.io');

module.exports.init = (server) => {
  const io = socketIo(server, {
    cors: config.cors || {},
    pingTimeout: 60000,
    pingInterval: 25000
  });
  
  io.on('connection', (socket) => {
    logger.info('WebSocket connected:', socket.id);
    
    socket.on('disconnect', () => {
      logger.info('WebSocket disconnected:', socket.id);
    });
  });
  
  return io;
};
```

### 9. CORS Configuration
**Priorité: Moyenne - Sécurité**

```bash
npm install cors
```

```javascript
// src/connect/cors.js
const cors = require('cors');

module.exports = cors({
  origin: (origin, callback) => {
    const whitelist = config.cors?.whitelist || ['http://localhost:3000'];
    
    if (!origin || whitelist.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  maxAge: 86400, // 24 heures
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID']
});
```

### 10. Tests de performance
**Priorité: Moyenne**

```bash
npm install --save-dev autocannon
```

```javascript
// test/performance/load-test.js
const autocannon = require('autocannon');

const run = async () => {
  const result = await autocannon({
    url: 'http://localhost:3000',
    connections: 100,
    duration: 30,
    pipelining: 1
  });
  
  console.log('Requests/sec:', result.requests.average);
  console.log('Latency p99:', result.latency.p99);
};

run();
```

## 🛠️ Améliorations techniques

### 11. Optimisation Lodash
**Priorité: Basse - Performance**

Remplacer les imports complets par des imports spécifiques:

```javascript
// Mauvais
const _ = require('lodash');
_.clone(obj);

// Bon
const clone = require('lodash/clone');
clone(obj);

// Encore mieux (natif)
{ ...obj }
```

### 12. Pipeline Redis pour batch operations
**Priorité: Basse - Performance**

```javascript
// src/cache.js
module.exports.putMany = async (namespace, items) => {
  if (!client) return;
  
  const pipeline = client.pipeline();
  
  for (const [id, value, timeout] of items) {
    const k = key(namespace, id);
    const v = serialize(value);
    pipeline.set(k, v);
    if (timeout) {
      pipeline.expire(k, timeout);
    }
  }
  
  return await pipeline.exec();
};

module.exports.getMany = async (namespace, ids) => {
  if (!client) return [];
  
  const pipeline = client.pipeline();
  const keys = ids.map(id => key(namespace, id));
  
  keys.forEach(k => pipeline.get(k));
  
  const results = await pipeline.exec();
  return results.map(([err, value]) => value ? deserialize(value) : null);
};
```

### 13. Async Route Wrapper
**Priorité: Moyenne - DX**

```javascript
// src/utils/async-handler.js
module.exports = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
```

Usage:
```javascript
const asyncHandler = require('./utils/async-handler');

app.get('/users', asyncHandler(async (req, res) => {
  const users = await User.findAll();
  res.json(users);
}));
```

### 14. Validation avec Zod
**Priorité: Basse - Type Safety**

```bash
npm install zod
```

```javascript
// src/forms/validators.js
const { z } = require('zod');

const userSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  age: z.number().int().min(18).optional(),
  role: z.enum(['user', 'admin']).default('user')
});

// Usage
class UserForm extends Form {
  validate() {
    const result = userSchema.safeParse(this.getValues());
    if (!result.success) {
      this.errors = result.error.issues;
    }
  }
}
```

## 📋 Checklist de migration

Pour chaque nouvelle version majeure:

- [ ] Mettre à jour les dépendances vulnérables
- [ ] Vérifier la compatibilité avec Express latest
- [ ] Tester avec Node.js LTS latest
- [ ] Mettre à jour la documentation
- [ ] Ajouter changelog détaillé
- [ ] Tests de régression complets
- [ ] Vérifier les breaking changes
- [ ] Créer guide de migration

## 🎯 Objectifs à 6 mois

1. **Couverture de tests à 90%**
2. **Zero vulnérabilités npm**
3. **Documentation API complète**
4. **Métriques et monitoring en production**
5. **Performance: < 50ms p95 latency**
6. **Zero downtime deployments**

## 💡 Idées innovantes

### Circuit Breaker
Protection contre les cascades de pannes:

```javascript
const CircuitBreaker = require('opossum');

const options = {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
};

const breaker = new CircuitBreaker(asyncFunction, options);
```

### Feature Flags
Déploiement progressif de features:

```javascript
const { Client } = require('launchdarkly-node-server-sdk');

const ldClient = Client.init(config.launchDarklyKey);

app.get('/new-feature', async (req, res) => {
  const enabled = await ldClient.variation('new-feature', req.user, false);
  
  if (enabled) {
    // Nouvelle feature
  } else {
    // Ancienne feature
  }
});
```

### GraphQL Support
Alternative/complément à REST:

```javascript
const { graphqlHTTP } = require('express-graphql');
const { buildSchema } = require('graphql');

const schema = buildSchema(`
  type Query {
    users: [User]
    user(id: ID!): User
  }
  
  type User {
    id: ID!
    name: String!
    email: String!
  }
`);

app.use('/graphql', graphqlHTTP({
  schema,
  rootValue: resolvers,
  graphiql: true
}));
```

## 📚 Ressources

- [Express Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [OWASP Node.js Security](https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html)
- [The Twelve-Factor App](https://12factor.net/)
