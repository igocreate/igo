@README.md

La documentation du projet est dans les `README.md` — celui-ci et ceux de
`api/`, `front/` et `e2e/`. Ce qui suit ne s'adresse qu'à l'assistant.

## Avant de livrer

```bash
pnpm lint && pnpm typecheck && pnpm test      # toujours
pnpm test:e2e                                 # dès qu'un écran change
```

## À ne pas défaire

- Pas d'autre interrupteur d'observabilité que `OTEL_EXPORTER_OTLP_ENDPOINT` et
  `VITE_FARO_URL` : leur absence désactive tout.
- `import './instrumentation'` reste la première ligne de `api/app.ts`, et
  `instrumentation.ts` commence par `import '@igojs/server/env'`. Rien de
  l'application n'y est importé.
- `beforeSend` dans `front/src/observability.ts` n'échantillonne que les
  événements ; exceptions, Web Vitals et spans passent toujours.
- Les secrets de session viennent du `.env`, jamais d'un fichier versionné.
- La langue du code et les conventions de chaque paquet s'appliquent telles
  qu'écrites dans les README : ne pas les réinterpréter au cas par cas.
