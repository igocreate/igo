const { elapsedMs } = require('../logfields');
const { logCall }   = require('./log');

const STARTED_AT = Symbol('igo.axiosCallStartedAt');
const LOGGED     = Symbol('igo.axiosCallsLogged');

const header = (headers, name) =>
  headers?.get?.(name) ?? headers?.[name] ?? headers?.[name.toLowerCase()];

const toCall = (instance, request, response, error) => ({
  method:       request.method ?? 'get',
  url:          instance.getUri(request),
  durationMs:   elapsedMs(request[STARTED_AT]),
  status:       response?.status,
  error,
  body:         request.data,
  bodyType:     header(request.headers, 'Content-Type'),
  response:     response?.data,
  responseType: header(response?.headers, 'Content-Type'),
});

const logHttpCalls = (instance) => {
  if (!instance?.interceptors || instance[LOGGED]) {
    return instance;
  }
  instance[LOGGED] = true;

  // registered first, it runs last among the request interceptors: the clock
  // starts as close to the wire as it can
  instance.interceptors.request.use((request) => {
    request[STARTED_AT] = process.hrtime.bigint();
    return request;
  });

  instance.interceptors.response.use(
    (response) => {
      logCall(toCall(instance, response.config, response));
      return response;
    },
    (error) => {
      const request = error?.config;
      // a cancellation is the caller's decision; an error without our start
      // was raised by another interceptor, before any call was made
      if (request?.[STARTED_AT] !== undefined && error.code !== 'ERR_CANCELED') {
        logCall(toCall(instance, request, error.response, error));
      }
      return Promise.reject(error);
    }
  );

  const create = instance.create;
  if (typeof create === 'function') {
    instance.create = (...args) => logHttpCalls(create.apply(instance, args));
  }
  return instance;
};

module.exports = logHttpCalls;
