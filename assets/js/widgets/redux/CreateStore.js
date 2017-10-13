import { createStore, applyMiddleware, compose } from 'redux';
import logger from 'redux-logger';
import thunkMiddleware from 'redux-thunk';
import rootReducer from './';

const development = process.env.NODE_ENV === 'development';

export default () => {
  const middlewares = [
    thunkMiddleware,
  ];

  if (development) {
    middlewares.push(logger);
  }

  const createStoreWithMiddleware = compose(
    applyMiddleware(...middlewares),
  )(createStore);

  return createStoreWithMiddleware(rootReducer);
};

