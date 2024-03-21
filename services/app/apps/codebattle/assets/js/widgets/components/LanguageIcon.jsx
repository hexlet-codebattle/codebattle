import React from 'react';

import ClojureOriginalIcon from 'react-devicons/clojure/original';
import CppOriginalIcon from 'react-devicons/cplusplus/original';
import CsharpOriginalIcon from 'react-devicons/csharp/original';
import DartOriginalIcon from 'react-devicons/dart/original';
import ElixirOriginalIcon from './icons/ElixirOriginalIcon';
import GolangOriginalIcon from 'react-devicons/go/original';
import HaskellOriginalIcon from 'react-devicons/haskell/original';
import JavaOriginalIcon from 'react-devicons/java/original';
import KotlinOriginalIcon from './icons/KotlinOriginalIcon';
import NodejsPlainIcon from 'react-devicons/nodejs/plain';
import PhpOriginalIcon from './icons/PhpOriginalIcon';
import PythonOriginalIcon from './icons/PythonOriginalIcon';
import RubyOriginalIcon from './icons/RubyOriginalIcon';
import RustOriginalIcon from './icons/RustOriginalIcon';
import TypescriptOriginalIcon from 'react-devicons/typescript/original';

const iconRenderers = {
  clojure: className => <ClojureOriginalIcon className={className} size="1.125em" />,
  cpp: className => <CppOriginalIcon className={className} size="1.25em" />,
  csharp: className => <CsharpOriginalIcon className={className} size="1.25em" />,
  dart: className => <DartOriginalIcon className={className} size="1.125em" />,
  elixir: className => <ElixirOriginalIcon className={className} size="1.25em" />,
  golang: className => <GolangOriginalIcon className={className} size="1.25em" />,
  haskell: className => <HaskellOriginalIcon className={className} size="1.125em" />,
  javascript: className => <NodejsPlainIcon className={className} color="green" size="1.25em" />,
  js: className => <NodejsPlainIcon className={className} color="green" size="1.25em" />,
  kotlin: className => <KotlinOriginalIcon className={className} />,
  php: className => <PhpOriginalIcon className={className} size="1.875em" />,
  python: className => <PythonOriginalIcon className={className} size="1.25em" />,
  ruby: className => <RubyOriginalIcon className={className} />,
  rust: className => <RustOriginalIcon className={className} size="1.125em" />,
  ts: className => <TypescriptOriginalIcon className={className} size="1.125em" />,
  typescript: className => <TypescriptOriginalIcon className={className} size="1.125em" />,
  java: className => (
    <JavaOriginalIcon
      className={className}
      style={{ transform: 'translateY(-0.125em)' }}
      size="1.25em"
    />
  ),
  default: () => null,
};

const LanguageIcon = ({ className = '', lang }) => {
  const renderIcon = iconRenderers[lang] || iconRenderers.default;

  return renderIcon(className);
};

export default LanguageIcon;
