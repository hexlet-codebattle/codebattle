const languages = {
  clojure: 'clojure',
  cpp: 'cpp',
  csharp: 'csharp',
  css: 'css',
  dart: 'dart',
  // Monaco has no D grammar; C++ highlighting fits D syntax well enough
  dlang: 'cpp',
  elixir: 'elixir',
  golang: 'go',
  java: 'java',
  js: 'javascript',
  kotlin: 'kotlin',
  less: 'less',
  mongodb: 'mongodb',
  mysql: 'mysql',
  php: 'php',
  postgresql: 'postgresql',
  python: 'python',
  ruby: 'ruby',
  rust: 'rust',
  sass: 'sass',
  stylus: 'stylus',
  swift: 'swift',
  ts: 'typescript',
  zig: 'zig',
};

export const cssProcessors = ['css', 'less', 'sass', 'stylus'];
export const dbNames = ['postgresql', 'mysql', 'mongodb'];

// Display names where the Monaco language id above is not the language's name
export const languageDisplayNames: Record<string, string> = {
  dlang: 'D',
};

export const constructorLangauges = ['ruby'];

export default languages;
