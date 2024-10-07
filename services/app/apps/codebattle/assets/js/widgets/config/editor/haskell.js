import tagKeywords from './tagKeywords';

export const language = {
  tagKeywords,
  keywords: [
    'module',
    'import',
    'main',
    'where',
    'otherwise',
    'newtype',
    'definition',
    'implementation',
    'from',
    'class',
    'instance',
    'abort',
  ],

  builtintypes: ['Int', 'Real', 'String'],

  operators: [
    '=',
    '==',
    '>=',
    '<=',
    '+',
    '-',
    '*',
    '/',
    '::',
    '->',
    '=:',
    '=>',
    '|',
    '$',
  ],

  numbers: /-?[0-9.]/,

  tokenizer: {
    root: [
      { include: '@whitespace' },

      [/->/, 'operators'],

      [/\|/, 'operators'],

      [/(\w*)(\s?)(::)/, ['keyword', 'white', 'operators']],

      [/[+\-*/=<>$]/, 'operators'],

      [
        /[a-zA-Z_][a-zA-Z0-9_]*/,
        {
          cases: {
            '@builtintypes': 'type',
            '@keywords': 'keyword',
            '@default': '',
          },
        },
      ],

      [/[()[\],:]/, 'delimiter'],

      [/@numbers/, 'number'],

      [/(")(.*)(")/, ['string', 'string', 'string']],
    ],

    comment: [
      [/[^/*]+/, 'comment'],
      [/\*\//, 'comment', '@pop'],
      [/[/*]/, 'comment'],
    ],

    whitespace: [
      [/[ \t\r\n]+/, 'white'],
      [/\/\*/, 'comment', '@comment'],
      [/\/\/.*$/, 'comment'],
      [/--.*$/, 'comment'],
    ],
  },
};

export default language;
