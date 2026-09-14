import { sendProblem } from '@igojs/server';
import type { NextFunction, Request, Response } from 'express';

export const UNAUTHENTICATED = '/problems/unauthenticated';

// Ce que la session contient et ce qu'on en fait — charger l'utilisateur,
// vérifier un rôle — appartient au projet ; ici on ne regarde que sa présence.
//
// Générique sur les paramètres de route : Express prend les handlers d'une route
// dans un seul paramètre rest, et une garde typée RequestHandler imposerait ses
// paramètres à un handler dont le schéma `params` les type autrement.
export const requireAuth = <P>(req: Request<P>, res: Response, next: NextFunction) => {
  if (!req.session?.userId) {
    return void sendProblem(res, 401, { type: UNAUTHENTICATED, detail: 'Connexion requise' });
  }
  next();
};
