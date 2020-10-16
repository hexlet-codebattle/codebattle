import Rollbar from "rollbar";

const isProd = process.env.NODE_ENV === 'production'

const rollbar = new Rollbar({
  accessToken: process.env.ROLLBAR_API_TOKEN,
  captureUncaught: true,
  captureUnhandledRejections: true,
  enabled: isProd,
  payload: {
    environment: `${process.env.NODE_ENV}:frontend`
  }
});

export default rollbar;
