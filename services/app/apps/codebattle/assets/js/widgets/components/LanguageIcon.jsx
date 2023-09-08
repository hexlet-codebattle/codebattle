import React from 'react';

import cn from 'classnames';

import { isMacintosh } from '../utils/browser';

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

function LanguageIcon({ lang }) {
  return (
    <span
      className={cn('d-flex', iconsToClass[lang], {
        'mt-2': isMacintosh(),
      })}
    />
  );
}

export default LanguageIcon;
