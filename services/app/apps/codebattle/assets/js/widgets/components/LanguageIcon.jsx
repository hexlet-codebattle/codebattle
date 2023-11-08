import React from 'react';

import cn from 'classnames';

import { isChrome, isSafari } from '../utils/browser';

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
  <span
    className={cn('d-flex align-self-end', iconsToClass[lang], { 'mt-2': isChrome() && !isSafari() })}
  />
);

export default LanguageIcon;
