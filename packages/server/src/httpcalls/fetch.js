const { elapsedMs } = require('../logfields');
const { logCall }   = require('./log');

const LOGGED = Symbol('igo.fetchCallsLogged');

const contentType = (headers) => {
  try {
    return new Headers(headers).get('content-type') ?? undefined;
  } catch {
    return undefined;
  }
};

// Aborting is the caller's decision, whatever reason it gave; a timeout is not.
const abortedByCaller = (error, signal) =>
  error?.name !== 'TimeoutError' && (error?.name === 'AbortError' || signal?.aborted);

module.exports = () => {
  const fetch = globalThis.fetch;
  if (typeof fetch !== 'function' || fetch[LOGGED]) {
    return;
  }

  const loggedFetch = async (input, init) => {
    const options   = init ?? {};
    const startedAt = process.hrtime.bigint();
    const call = {
      method:   options.method ?? input?.method ?? 'GET',
      url:      input?.url ?? String(input),
      body:     options.body,
      bodyType: contentType(options.headers ?? input?.headers),
    };

    let response;
    try {
      response = await fetch(input, init);
    } catch (error) {
      if (!abortedByCaller(error, options.signal ?? input?.signal)) {
        // `fetch failed` says nothing: the cause says refused, reset, not found
        logCall({ ...call, durationMs: elapsedMs(startedAt), error: error?.cause ?? error });
      }
      throw error;
    }

    const answered = {
      ...call,
      durationMs:   elapsedMs(startedAt),
      status:       response.status,
      responseType: response.headers.get('content-type') ?? undefined,
    };
    if (response.status < 400) {
      logCall(answered);
      return response;
    }
    response.clone().arrayBuffer().then(
      (payload) => logCall({ ...answered, response: payload }),
      () => logCall(answered)
    );
    return response;
  };

  loggedFetch[LOGGED] = true;
  globalThis.fetch = loggedFetch;
};
