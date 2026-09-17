@README.md

## À vérifier sur tout parcours

- Un écran ajouté au parcours s'ajoute au test d'accessibilité.
- Les POM n'ont pas d'assertion ; les tests n'ont pas de `waitForTimeout` ni de
  sélecteur CSS.
- Un test crée les données qu'il lit ou modifie ; il ne compte pas sur les seeds.
