# PaginatedOptimizedQuery

Cette documentation a été déplacée dans le guide des modèles.

👉 **[Voir la documentation complète dans Models > Paginated Optimized Query](guide/models.md#paginated-optimized-query)**

## Accès rapide

```javascript
// Utilisation de base
const result = await MyModel.paginatedOptimized()
  .where({
    type: ['agp', 'avt'],
    'association.field': 'value'
  })
  .order('created_at DESC')
  .page(1, 50)
  .execute();
```

**Amélioration de performance : 50x à 100x plus rapide sur de grosses tables !**

📖 [Documentation complète →](guide/models.md#paginated-optimized-query)
