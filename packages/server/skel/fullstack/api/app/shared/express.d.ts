declare namespace Express {
  interface Request {
    // restart(): à appeler au login, les délais d'expiration repartent de zéro
    session: { userId?: number; restart(): void; [key: string]: unknown } | null;
  }
}
