// Ce que le projet range dans req.session ; restart(), regenerate() et save() viennent d'igo
declare module '@igojs/server' {
  interface Session {
    userId?: number;
  }
}

export {};
