// Document de problème RFC 9457, tel qu'igo le renvoie sur chaque erreur d'API.
export interface Problem {
  type: string;
  title: string;
  status: number;
  detail?: string;
  errors?: { path: string; code?: string; message: string }[];
}

export class ApiError extends Error {
  readonly problem: Problem;

  /** L'identifiant de trace renvoyé par le serveur, s'il en a renvoyé un. */
  readonly traceId?: string;

  constructor(problem: Problem, traceId?: string) {
    super(problem.detail || problem.title);
    this.name = 'ApiError';
    this.problem = problem;
    this.traceId = traceId;
  }

  /** Message for one field, to sit under the input that caused it. */
  fieldError(path: string): string | undefined {
    return this.problem.errors?.find((e) => e.path === path)?.message;
  }
}

const TRACERESPONSE = /^[0-9a-f]{2}-([0-9a-f]{32})-[0-9a-f]{16}-[0-9a-f]{2}$/;

// W3C Trace Context Level 2 définit `traceresponse` pour le retour. Faro ne
// l'exploite pas, on le lit donc à la main : seul le trace-id sert au support.
const traceIdDeLaReponse = (response: Response) => {
  const entete = response.headers.get('traceresponse');
  return (entete && TRACERESPONSE.exec(entete)?.[1]) || undefined;
};

// URL relatives à dessein : le même build tourne alors sur tous les
// environnements, derrière le proxy de développement ou derrière nginx.
const request = async <T>(method: string, path: string, body?: unknown): Promise<T> => {
  const response = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const problem = await response.json().catch(() => ({
      type: 'about:blank',
      title: response.statusText,
      status: response.status,
    }));
    throw new ApiError(problem as Problem, traceIdDeLaReponse(response));
  }

  return response.status === 204 ? (undefined as T) : response.json();
};

export const apiClient = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};
