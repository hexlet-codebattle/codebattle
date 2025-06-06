import React from 'react';

import ClojureOriginalIcon from 'react-devicons/clojure/original';
import CppOriginalIcon from 'react-devicons/cplusplus/original';
import CsharpOriginalIcon from 'react-devicons/csharp/original';
import CssOriginalIcon from 'react-devicons/css3/original';
import DartOriginalIcon from 'react-devicons/dart/original';
import GolangOriginalIcon from 'react-devicons/go/original';
import HaskellOriginalIcon from 'react-devicons/haskell/original';
import JavaOriginalIcon from 'react-devicons/java/original';
import LessOriginalIcon from 'react-devicons/less/plain-wordmark';
import NodejsPlainIcon from 'react-devicons/nodejs/plain';
import SassOriginalIcon from 'react-devicons/sass/original';
import StylusOriginalIcon from 'react-devicons/stylus/original';
import SwiftOriginalIcon from 'react-devicons/swift/original';
import TypescriptOriginalIcon from 'react-devicons/typescript/original';

import ElixirOriginalIcon from './icons/ElixirOriginalIcon';
import KotlinOriginalIcon from './icons/KotlinOriginalIcon';
import PhpOriginalIcon from './icons/PhpOriginalIcon';
import PythonOriginalIcon from './icons/PythonOriginalIcon';
import RubyOriginalIcon from './icons/RubyOriginalIcon';
import RustOriginalIcon from './icons/RustOriginalIcon';

const iconRenderers = {
  clojure: className => <ClojureOriginalIcon className={className} size="1.125em" />,
  cpp: className => <CppOriginalIcon className={className} size="1.25em" />,
  csharp: className => <CsharpOriginalIcon className={className} size="1.25em" />,
  swift: className => <SwiftOriginalIcon className={className} size="1.25em" />,
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
  css: className => <CssOriginalIcon className={className} size="1.125em" />,
  stylus: className => <StylusOriginalIcon className={className} size="1.185em" />,
  less: className => <LessOriginalIcon className={className} size="1.135em" />,
  sass: className => <SassOriginalIcon className={className} size="1.135em" />,
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
