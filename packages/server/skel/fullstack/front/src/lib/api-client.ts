// RFC 9457 problem document, as returned by igo on every API error.
export interface Problem {
  type:    string;
  title:   string;
  status:  number;
  detail?: string;
  errors?: { path: string; code?: string; message: string }[];
}

export class ApiError extends Error {
  readonly problem: Problem;

  constructor(problem: Problem) {
    super(problem.detail || problem.title);
    this.name    = 'ApiError';
    this.problem = problem;
  }

  /** Message for one field, to sit under the input that caused it. */
  fieldError(path: string): string | undefined {
    return this.problem.errors?.find(e => e.path === path)?.message;
  }
}

// Relative URLs on purpose: the same build then runs against every
// environment, behind the dev proxy or behind nginx.
const request = async <T>(method: string, path: string, body?: unknown): Promise<T> => {
  const response = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body:    body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const problem = await response.json().catch(() => ({
      type: 'about:blank', title: response.statusText, status: response.status,
    }));
    throw new ApiError(problem as Problem);
  }

  return response.status === 204 ? (undefined as T) : response.json();
};

export const apiClient = {
  get:    <T>(path: string)                => request<T>('GET', path),
  post:   <T>(path: string, body: unknown) => request<T>('POST', path, body),
  put:    <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  delete: <T>(path: string)                => request<T>('DELETE', path),
};
