# Nouvelles Fonctionnalités @igojs/server

Ce document décrit les nouvelles fonctionnalités ajoutées au package `@igojs/server`.

## 🔒 Sécurité Renforcée

### Secrets Obligatoires en Production

Le serveur refuse désormais de démarrer en production si les secrets ne sont pas configurés.

**Variables d'environnement requises en production:**
```bash
COOKIE_SECRET=your-strong-secret-here
COOKIE_SESSION_KEYS=key1,key2,key3
```

**Comportement:**
- **Production:** Erreur fatale si les secrets ne sont pas définis
- **Development:** Avertissement si les secrets par défaut sont utilisés
- **Test:** Génération automatique de secrets aléatoires

### Mailer Amélioré

Le module `mailer.send` est désormais une vraie Promise pour une meilleure gestion d'erreurs:

```javascript
try {
  await mailer.send('welcome', {
    to: user.email,
    lang: user.lang,
    name: user.name
  });
  console.log('Email sent successfully');
} catch (err) {
  console.error('Failed to send email:', err);
  // Implémenter retry logic si nécessaire
}
```

## 🏥 Health Check

Nouveau endpoint de santé pour monitoring:

```javascript
const { health } = require('@igojs/server');

// Dans vos routes
app.get('/health', health);
```

**Réponse (200 OK):**
```json
{
  "status": "ok",
  "timestamp": "2026-02-10T22:11:18.528Z",
  "uptime": 3600.5,
  "checks": {
    "database": {
      "status": "ok",
      "message": "Database connected"
    },
    "cache": {
      "status": "ok",
      "message": "Redis connected",
      "keys": 42
    },
    "memory": {
      "status": "ok",
      "usage": {
        "rss": 50331648,
        "heapTotal": 18874368,
        "heapUsed": 12345678
      }
    }
  }
}
```

**Réponse dégradée (503 Service Unavailable):**
```json
{
  "status": "degraded",
  "timestamp": "2026-02-10T22:11:18.528Z",
  "uptime": 3600.5,
  "checks": {
    "database": {
      "status": "error",
      "message": "Connection timeout"
    },
    "cache": { "status": "ok" },
    "memory": { "status": "ok" }
  }
}
```

## 🔄 Graceful Shutdown

Arrêt propre de l'application avec fermeture des connexions:

```javascript
const { app, gracefulShutdown } = require('@igojs/server');

await app.configure();

const server = app.listen(3000, () => {
  console.log('Server started on port 3000');
});

// Setup graceful shutdown
gracefulShutdown.setup(server);
```

**Comportement:**
1. Signal SIGTERM/SIGINT reçu
2. Arrêt d'accepter de nouvelles connexions
3. Attente de la fin des requêtes en cours
4. Fermeture des connexions DB
5. Fermeture de la connexion Redis
6. Arrêt propre (exit 0)
7. Si timeout (30s) dépassé: arrêt forcé (exit 1)

**Logs:**
```
SIGTERM received, starting graceful shutdown...
HTTP server closed - no new connections accepted
Closing database connections...
Database connections closed
Closing Redis connection...
Redis connection closed
Graceful shutdown complete
```

## 🆔 Request ID

Traçabilité des requêtes avec ID unique:

```javascript
const { requestId } = require('@igojs/server');

// Dans app.js, avant les routes
app.use(requestId);

// Dans vos routes
app.get('/api/users', (req, res) => {
  console.log(`Processing request ${req.id}`);
  logger.info(`Request ${req.id}: Fetching users`);
  res.json({ requestId: req.id, users: [] });
});
```

**Headers:**
- Requête avec `X-Request-ID: abc-123` → utilise `abc-123`
- Requête sans header → génère un UUID v4
- Réponse inclut toujours `X-Request-ID` dans les headers

**Exemple de traçabilité:**
```javascript
// Client envoie
curl -H "X-Request-ID: my-trace-123" https://api.example.com/users

// Serveur log
[INFO] Request my-trace-123: Fetching users
[INFO] Request my-trace-123: DB query completed in 45ms
[INFO] Request my-trace-123: Response sent

// Réponse inclut
X-Request-ID: my-trace-123
```

## 💾 Cache Amélioré

### Nouvelles fonctionnalités Redis

**Statistiques de cache:**
```javascript
const stats = await cache.getStats();
console.log(stats);
// {
//   connected: true,
//   keys: 1234,
//   info: "redis_version:7.0.0\r\n..."
// }
```

**Déconnexion propre:**
```javascript
await cache.disconnect();
```

**Gestion améliorée des erreurs:**
- Reconnexion automatique en cas de déconnexion
- Logs détaillés des événements Redis (error, reconnecting, ready)

### JSDoc ajoutée

Toutes les méthodes principales du cache sont maintenant documentées:

```javascript
/**
 * Fetch from cache or compute and store
 * @param {string} namespace - Cache namespace
 * @param {string} id - Cache key identifier
 * @param {Function} func - Function to call if cache miss
 * @param {number} [timeout] - Optional expiration timeout
 * @returns {Promise<*>} Cached or computed value
 */
await cache.fetch('users', userId, async (id) => {
  return await User.findById(id);
}, 3600);
```

## 📋 Routage Optimisé

Le handler 404 utilise maintenant `app.use()` au lieu d'une regex:

```javascript
// Avant (moins efficace)
app.all(/.*/, (req, res) => {
  res.status(404).render('errors/404');
});

// Après (plus efficace)
app.use((req, res) => {
  res.status(404).render('errors/404');
});
```

**Performance:** Pas de regex à évaluer pour chaque route non trouvée.

## 🎯 Exemple Complet

```javascript
const server = require('@igojs/server');
const { app, config, gracefulShutdown, health, requestId } = server;

(async () => {
  // Configuration
  await app.configure();

  // Middleware personnalisés
  app.use(requestId);
  app.get('/health', health);

  // Routes de l'application
  app.get('/api/stats', async (req, res) => {
    const cacheStats = await server.cache.getStats();
    res.json({ 
      requestId: req.id,
      cache: cacheStats 
    });
  });

  // Démarrage du serveur
  const httpServer = app.listen(config.httpport, () => {
    console.log(`Server listening on port ${config.httpport}`);
  });

  // Setup graceful shutdown
  gracefulShutdown.setup(httpServer);
})();
```

## 🔧 Migration depuis v6.0.0-beta.9

### Changements Breaking

1. **Secrets en production** - Ajouter à `.env.production`:
   ```bash
   COOKIE_SECRET=<générer un secret fort>
   COOKIE_SESSION_KEYS=<key1>,<key2>,<key3>
   ```

2. **Mailer.send** - Maintenant une Promise:
   ```javascript
   // Avant (callback)
   mailer.send('template', data);
   
   // Après (await)
   await mailer.send('template', data);
   ```

### Fonctionnalités Optionnelles

Ces fonctionnalités sont opt-in et n'affectent pas le code existant:

- Health check: Ajouter `app.get('/health', health)`
- Graceful shutdown: Appeler `gracefulShutdown.setup(server)`
- Request ID: Ajouter `app.use(requestId)`
- Cache stats: Utiliser `cache.getStats()` si besoin

## 📚 Documentation

Pour plus d'informations, voir:
- [CODE_REVIEW_SERVER.md](../../CODE_REVIEW_SERVER.md) - Analyse complète du code
- [Package README](./README.md) - Documentation principale
