import Rollbar from 'rollbar';
import Gon from 'gon';

const isProd = process.env.NODE_ENV === 'production';

const rollbar = new Rollbar({
  accessToken: Gon.getAsset('rollbar_api_key'),
  captureUncaught: true,
  captureUnhandledRejections: true,
  enabled: isProd,
  payload: {
    environment: process.env.NODE_ENV,
  },
});

rollbar.global({
  itemsPerMinute: 5,
  maxItems: 10,
});

export default rollbar;
