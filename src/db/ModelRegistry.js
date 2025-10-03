
const logger = require('../logger');

//
// ModelRegistry - Gestion centralisée des modèles
//
// Permet de résoudre les dépendances circulaires en utilisant des strings
// au lieu de références directes aux classes
//
class ModelRegistry {

  static models = new Map();

  // Enregistre un modèle dans le registry
  static register(name, modelClass) {
    if (this.models.has(name)) {
      logger.warn(`Model '${name}' is already registered. Overwriting.`);
    }
    this.models.set(name, modelClass);
    return modelClass;
  }

  // Résout une référence vers un modèle
  // Accepte: string, classe Model, ou fonction lazy
  static resolve(modelRef) {
    // Si c'est déjà une classe Model
    if (typeof modelRef === 'object' || (typeof modelRef === 'function' && modelRef.schema)) {
      return modelRef;
    }

    // Si c'est un string, chercher dans le registry
    if (typeof modelRef === 'string') {
      const model = this.models.get(modelRef);
      if (!model) {
        const available = Array.from(this.models.keys()).join(', ');
        throw new Error(
          `Model '${modelRef}' not found in registry. ` +
          `Available models: ${available || '(none)'}`
        );
      }
      return model;
    }

    // Si c'est une fonction lazy
    if (typeof modelRef === 'function') {
      return modelRef();
    }

    throw new Error(`Invalid model reference: ${modelRef}`);
  }

  // Liste tous les modèles enregistrés (utile pour debug)
  static list() {
    return Array.from(this.models.keys());
  }

  // Vide le registry (utile pour les tests)
  static clear() {
    this.models.clear();
  }
}

module.exports = ModelRegistry;
