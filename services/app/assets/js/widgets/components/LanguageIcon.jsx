import React from 'react';

const iconsToClass = {
  js: 'icon-nodejs align-middle',
  ts: 'icon-nodejs align-middle',
  golang: 'icon-docker align-middle',
  ruby: 'icon-ruby align-middle',
  elixir: 'icon-elixir align-middle',
  haskell: 'icon-haskell align-middle',
  clojure: 'icon-clojure align-middle',
  python: 'icon-python align-middle',
  php: 'icon-php-alt align-middle',
  perl: 'icon-perl align-middle',
};

export default ({ lang }) => <span className={iconsToClass[lang]} />;
