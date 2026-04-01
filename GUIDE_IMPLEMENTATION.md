# Guide d'Implémentation Rapide - Optimisations Critiques

Ce guide présente les modifications les plus critiques à implémenter immédiatement, avec des exemples de code prêts à l'emploi.

## 🔥 Actions Immédiates (< 1 jour)

### 1. Configurer les secrets en production

**Fichier: `.env.production`**
```bash
# Générer un secret fort
COOKIE_SECRET=$(openssl rand -base64 32)
COOKIE_SESSION_KEYS=$(openssl rand -base64 32),$(openssl rand -base64 32),$(openssl rand -base64 32)

# Database
MYSQL_HOST=your-db-host
MYSQL_USERNAME=your-username
MYSQL_PASSWORD=your-password
MYSQL_DATABASE=your-database

# Redis
REDIS_HOST=your-redis-host
REDIS_PORT=6379

# SMTP
SMTP_HOST=smtp.your-provider.com
SMTP_USER=your-smtp-user
SMTP_PASSWORD=your-smtp-password
SMTP_FROM=noreply@yourdomain.com
```

**Commande pour générer les secrets:**
```bash
# Linux/Mac
openssl rand -base64 32

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 2. Activer les nouvelles fonctionnalités

**Fichier: `app/index.js` ou votre point d'entrée**
```javascript
const server = require('@igojs/server');
const { app, config, gracefulShutdown, health, requestId } = server;

(async () => {
  // 1. Configuration
  await app.configure();

  // 2. Ajouter request ID pour tracing
  app.use(requestId);

  // 3. Health check endpoint
  app.get('/health', health);

  // 4. Vos routes...
  require('./routes').init(app);

  // 5. Démarrer le serveur
  const httpServer = app.listen(config.httpport, () => {
    console.log(`✅ Server started on port ${config.httpport}`);
  });

  // 6. Setup graceful shutdown
  gracefulShutdown.setup(httpServer);
})();
```

### 3. Mettre à jour le code mailer

**Avant:**
```javascript
// Callback style - NE FONCTIONNE PLUS
mailer.send('welcome', { to: user.email });
```

**Après:**
```javascript
// Promise style - NOUVEAU
try {
  await mailer.send('welcome', { 
    to: user.email,
    lang: user.lang,
    name: user.name 
  });
  logger.info('Email sent successfully');
} catch (err) {
  logger.error('Failed to send email:', err);
  // Implémenter retry logic si nécessaire
}
```

## 📊 Monitoring (< 2 heures)

### 1. Dashboard de santé simple

**Fichier: `app/routes/admin.js`**
```javascript
const { cache, dbs } = require('@igojs/server');

module.exports.init = (app) => {
  
  // Dashboard admin (protéger avec authentication!)
  app.get('/admin/stats', async (req, res) => {
    const stats = {
      cache: await cache.getStats(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      env: config.env,
      version: require('../../package.json').version
    };
    
    res.render('admin/stats', { stats });
  });
};
```

**Template: `views/admin/stats.dust`**
```html
<!DOCTYPE html>
<html>
<head>
  <title>Server Statistics</title>
  <style>
    body { font-family: Arial; margin: 20px; }
    .stat { margin: 10px 0; padding: 10px; background: #f5f5f5; }
    .ok { color: green; }
    .error { color: red; }
  </style>
</head>
<body>
  <h1>Server Statistics</h1>
  
  <div class="stat">
    <strong>Environment:</strong> {env}
  </div>
  
  <div class="stat">
    <strong>Uptime:</strong> {uptime} seconds
  </div>
  
  <div class="stat">
    <strong>Memory:</strong> {memory.heapUsed} / {memory.heapTotal} bytes
  </div>
  
  <div class="stat">
    <strong>Cache Status:</strong> 
    <span class="{stats.cache.connected?ok:error}">
      {stats.cache.connected?Connected:Disconnected}
    </span>
    {?stats.cache.keys}
      - {stats.cache.keys} keys
    {/stats.cache.keys}
  </div>
</body>
</html>
```

### 2. Logging amélioré

**Fichier: `app/config.js`**
```javascript
module.exports.init = (config) => {
  
  // Log tous les requests en dev
  if (config.env === 'dev') {
    const morgan = require('morgan');
    app.use(morgan('dev'));
  }
  
  // Log requests lents
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      if (duration > 1000) { // > 1 seconde
        logger.warn(`Slow request: ${req.method} ${req.originalUrl} - ${duration}ms`);
      }
    });
    next();
  });
};
```

## 🔐 Sécurité (< 3 heures)

### 1. Rate limiting basique

**Installation:**
```bash
npm install express-rate-limit
```

**Fichier: `app/config.js`**
```javascript
const rateLimit = require('express-rate-limit');

module.exports.init = (config) => {
  
  // Rate limit pour API
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests par IP
    message: 'Too many requests, please try again later.'
  });
  
  app.use('/api/', apiLimiter);
  
  // Rate limit strict pour auth
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5, // 5 tentatives par IP
    skipSuccessfulRequests: true
  });
  
  app.post('/login', authLimiter, (req, res) => {
    // Login logic
  });
};
```

### 2. Helmet pour headers de sécurité

**Installation:**
```bash
npm install helmet
```

**Fichier: `src/app.js`**
```javascript
const helmet = require('helmet');

module.exports.configure = async () => {
  // ... existing code ...
  
  // Ajouter avant les autres middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  }));
  
  // ... rest of configuration ...
};
```

### 3. Validation des entrées

**Fichier: `app/routes/users.js`**
```javascript
const { body, validationResult } = require('express-validator');

module.exports.init = (app) => {
  
  app.post('/api/users',
    // Validations
    body('email').isEmail().normalizeEmail(),
    body('name').trim().isLength({ min: 2, max: 100 }),
    body('age').optional().isInt({ min: 0, max: 150 }),
    
    async (req, res) => {
      // Vérifier les erreurs
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      // Créer l'utilisateur
      const user = await User.create(req.body);
      res.json(user);
    }
  );
};
```

## 🐛 Debugging amélioré

### 1. Meilleurs logs d'erreur

**Fichier: `src/logger.js`**
```javascript
// Ajouter à la fin du fichier

// Log unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', reason);
});

// Log warnings
process.on('warning', (warning) => {
  logger.warn('Warning:', warning);
});
```

### 2. Request correlation

**Fichier: `src/logger.js`**
```javascript
const logger = winston.createLogger({
  // ... existing config ...
});

// Ajouter contexte automatique
logger.request = (req) => {
  return logger.child({
    requestId: req.id,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip
  });
};

module.exports = logger;
```

**Usage dans les routes:**
```javascript
app.get('/api/users', async (req, res) => {
  const log = logger.request(req);
  
  log.info('Fetching users');
  const users = await User.findAll();
  log.info(`Found ${users.length} users`);
  
  res.json(users);
});
```

## 📈 Performance

### 1. Caching intelligent

**Fichier: `app/routes/api.js`**
```javascript
const { cache } = require('@igojs/server');

module.exports.init = (app) => {
  
  // Cache avec fetch
  app.get('/api/users/:id', async (req, res) => {
    const user = await cache.fetch(
      'users',           // namespace
      req.params.id,     // key
      async (id) => {    // function si cache miss
        return await User.findById(id);
      },
      3600               // timeout 1 heure
    );
    
    res.json(user);
  });
  
  // Invalider cache lors de la mise à jour
  app.put('/api/users/:id', async (req, res) => {
    const user = await User.update(req.params.id, req.body);
    
    // Invalider le cache
    await cache.del('users', req.params.id);
    
    res.json(user);
  });
};
```

### 2. Compression conditionnelle

**Déjà implémenté dans `src/app.js`**, mais vous pouvez optimiser:

```javascript
// Ne pas compresser les images/vidéos
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    
    // Ne pas compresser les fichiers déjà compressés
    const type = res.getHeader('Content-Type');
    if (type && /image|video/.test(type)) {
      return false;
    }
    
    return compression.filter(req, res);
  },
  threshold: 1024
}));
```

## 🚀 Déploiement

### 1. PM2 Ecosystem file

**Fichier: `ecosystem.config.js`**
```javascript
module.exports = {
  apps: [{
    name: 'igo-app',
    script: './app/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    merge_logs: true,
    max_memory_restart: '1G',
    watch: false
  }]
};
```

**Commandes:**
```bash
# Démarrer
pm2 start ecosystem.config.js --env production

# Status
pm2 status

# Logs
pm2 logs

# Redémarrer
pm2 reload igo-app

# Arrêter
pm2 stop igo-app
```

### 2. Docker

**Fichier: `Dockerfile`**
```dockerfile
FROM node:22-alpine

WORKDIR /app

# Copier package files
COPY package*.json ./

# Installer dependencies
RUN npm ci --only=production

# Copier le code
COPY . .

# Exposer le port
EXPOSE 3000

# Démarrer
CMD ["node", "app/index.js"]
```

**Fichier: `docker-compose.yml`**
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      COOKIE_SECRET: ${COOKIE_SECRET}
      COOKIE_SESSION_KEYS: ${COOKIE_SESSION_KEYS}
      MYSQL_HOST: db
      REDIS_HOST: redis
    depends_on:
      - db
      - redis
    restart: unless-stopped

  db:
    image: mysql:8
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: ${MYSQL_DATABASE}
    volumes:
      - db-data:/var/lib/mysql
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    restart: unless-stopped

volumes:
  db-data:
```

## ✅ Checklist de déploiement

Avant de déployer en production:

- [ ] Variables d'environnement configurées (secrets, DB, Redis)
- [ ] Logs configurés (rotation, niveau approprié)
- [ ] Health check endpoint testé
- [ ] Graceful shutdown configuré
- [ ] Rate limiting activé
- [ ] Helmet headers configurés
- [ ] CORS configuré si nécessaire
- [ ] Compression activée
- [ ] Monitoring en place
- [ ] Backups DB configurés
- [ ] SSL/TLS configuré
- [ ] DNS configuré
- [ ] Firewall configuré

## 🆘 Troubleshooting

### Redis ne se connecte pas
```javascript
// Vérifier status
const stats = await cache.getStats();
console.log('Redis connected:', stats.connected);

// En mode test sans Redis
if (config.env === 'test') {
  // Les opérations cache retournent null - c'est normal
}
```

### Erreur "COOKIE_SECRET must be set"
```bash
# Ajouter à .env
echo "COOKIE_SECRET=$(openssl rand -base64 32)" >> .env
echo "COOKIE_SESSION_KEYS=$(openssl rand -base64 32),$(openssl rand -base64 32)" >> .env
```

### Serveur ne s'arrête pas proprement
```javascript
// Vérifier que graceful shutdown est activé
gracefulShutdown.setup(httpServer);

// Envoyer SIGTERM
kill -TERM <PID>

// Voir les logs
// Doit afficher: "SIGTERM received, starting graceful shutdown..."
```

## 📞 Support

Pour toute question:
1. Consulter [CODE_REVIEW_SERVER.md](CODE_REVIEW_SERVER.md)
2. Consulter [NOUVELLES_FONCTIONNALITES.md](packages/server/NOUVELLES_FONCTIONNALITES.md)
3. Consulter [RECOMMANDATIONS_FUTURES.md](RECOMMANDATIONS_FUTURES.md)
