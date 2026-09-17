declare namespace Express {
  interface Request {
    session: { userId?: number; [key: string]: unknown } | null;
  }
}
