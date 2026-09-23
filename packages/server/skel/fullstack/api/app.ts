import { stopTelemetry } from './instrumentation';

import { app, config } from '@igojs/server';

app.run(() => {
  config.onShutdown = stopTelemetry;
  config.onCrash = stopTelemetry;
});
