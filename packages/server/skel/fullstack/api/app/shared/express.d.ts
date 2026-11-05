declare namespace Express {
  interface Request {
    // restart(): à appeler au login, les délais d'expiration repartent de zéro
    // regenerate() / save() : pour passport
    session: {
      userId?: number;
      restart(): void;
      regenerate(cb?: (err?: unknown) => void): void;
      save(cb?: (err?: unknown) => void): void;
      [key: string]: unknown;
    } | null;
  }
}
