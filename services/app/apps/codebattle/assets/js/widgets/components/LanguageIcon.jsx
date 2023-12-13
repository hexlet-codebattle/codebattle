import React from 'react';

import cn from 'classnames';

const iconsToClass = {
  js: 'icon-nodejs',
  javascript: 'icon-nodejs',
  ts: 'icon-nodejs',
  typescript: 'icon-nodejs',
  dart: 'icon-ghost',
  golang: 'icon-go',
  cpp: 'icon-cplusplus',
  csharp: 'icon-csharp',
  java: 'icon-java',
  kotlin: 'icon-java-bold',
  ruby: 'icon-ruby',
  elixir: 'icon-elixir',
  haskell: 'icon-haskell',
  clojure: 'icon-clojure',
  python: 'icon-python',
  php: 'icon-php-alt',
};

const LanguageIcon = ({ lang }) => (
  <span className={cn('d-inline-block', iconsToClass[lang])} style={{ marginTop: 2 }} />
);

export default LanguageIcon;
