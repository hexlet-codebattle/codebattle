// import tagKeywords from './tagKeywords';

const comparisonOperators = [
  'eq', 'gt', 'gte', 'lt', 'lte', 'ne', 'in', 'nin', 'exists',
];

const logicalOperators = [
  'and', 'not', 'nor', 'or',
];

const mongoOperators = [
  'accumulator', 'addToSet', 'avg', 'bottom', 'bottomN', 'covariancePop',
  'covarianceSamp', 'count', 'derivative', 'denseRank', 'documentNumber',
  'expMovingAvg', 'first', 'firstN', 'integral', 'last', 'lastN', 'max',
  'maxN', 'median', 'min', 'minN', 'percentile', 'push', 'rank', 'stdDevPop',
  'stdDevSamp', 'shift', 'sum', 'top', 'topN', 'locf', 'linearFill',
  'convert', 'ltrim', 'rtrim', 'toBool', 'toDate', 'toDecimal', 'toDouble',
  'toInt', 'toLong', 'toObjectId', 'toString', 'trim', 'abs', 'add',
  'allElementsTrue', 'anyElementTrue', 'arrayElemAt', 'arrayToObject',
  'binarySize', 'bsonSize', 'ceil', 'cmp', 'concat', 'concatArrays', 'cond',
  'dateAdd', 'dateDiff', 'dateFromParts', 'dateFromString', 'dateSubtract',
  'dateToParts', 'dateToString', 'dateTrunc', 'dayOfMonth', 'dayOfWeek',
  'dayOfYear', 'divide', 'exp', 'filter', 'floor', 'function',
  'getField', 'hour', 'ifNull', 'indexOfArray',
  'indexOfBytes', 'indexOfCP', 'isArray', 'isNumber', 'isoDayOfWeek',
  'isoWeek', 'isoWeekYear', 'let', 'literal', 'ln', 'log', 'log10', 'map',
  'mergeObjects', 'meta', 'millisecond', 'minute', 'mod', 'month', 'multiply',
  'objectToArray', 'pow', 'range', 'reduce', 'regexFind',
  'regexFindAll', 'regexMatch', 'replaceAll', 'replaceOne', 'reverseArray',
  'second', 'setDifference', 'setEquals', 'setIntersection', 'setIsSubset',
  'setUnion', 'size', 'slice', 'sortArray', 'split', 'sqrt', 'strcasecmp',
  'strLenBytes', 'strLenCP', 'substr', 'substrBytes', 'substrCP', 'subtract',
  'switch', 'toHashedIndexKey', 'toLower', 'toUpper', 'tsSecond', 'tsIncrement',
  'trunc', 'type', 'week', 'year', 'zip', 'bitAnd', 'bitOr', 'bitXor',
  'bitNot', 'all', 'bitsAllClear', 'bitsAllSet', 'bitsAnyClear', 'bitsAnySet',
  'comment', 'elemMatch', 'expr', 'geoIntersects', 'geoWithin',
  'jsonSchema', 'near', 'nearSphere',
  'regex', 'text', 'where', 'addFields', 'bucket', 'bucketAuto',
  'changeStream', 'collStats', 'currentOp', 'densify', 'documents', 'facet',
  'fill', 'geoNear', 'graphLookup', 'group', 'indexStats', 'limit',
  'listLocalSessions', 'lookup', 'match', 'merge', 'out', 'project',
  'redact', 'replaceRoot', 'replaceWith', 'sample', 'search', 'searchMeta',
  'set', 'setWindowFields', 'skip', 'sort', 'sortByCount', 'unionWith',
  'unset', 'unwind', 'vectorSearch',
];

export const languageConfig = {
  comments: {
    lineComment: '//',
    blockComment: ['/*', '*/'],
  },
  brackets: [
    ['{', '}'],
    ['[', ']'],
    ['(', ')'],
  ],
  autoClosingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: "'", close: "'", notIn: ['string', 'comment'] },
    { open: '"', close: '"', notIn: ['string'] },
    { open: '`', close: '`', notIn: ['string', 'comment'] },
    { open: '/**', close: ' */', notIn: ['string'] },
  ],
  surroundingPairs: [
    ['{', '}'],
    ['[', ']'],
    ['(', ')'],
    ["'", "'"],
    ['"', '"'],
    ['`', '`'],
  ],
  folding: {
    markers: {
      start: /^\s*\/\/\s*#?region\b/,
      end: /^\s*\/\/\s*#?endregion\b/,
    },
  },
};

export default {
  defaultToken: '',
  tagKeywords: [...mongoOperators, ...comparisonOperators, ...logicalOperators],

  tokenizer: {
    root: [
      // Comments
      [/\/\/.*$/, 'comment'],
      [/\/\*/, 'comment', '@comment'],

      // Strings
      [/"([^"\\]|\\.)*$/, 'string.invalid'],
      [/'([^'\\]|\\.)*$/, 'string.invalid'],
      [/"/, 'string', '@string_double'],
      [/'/, 'string', '@string_single'],

      // Numbers
      [/-?\d*\.\d+([eE][-+]?\d+)?/, 'number.float'],
      [/0[xX][0-9a-fA-F]+/, 'number.hex'],
      [/-?\d+/, 'number'],

      // Brackets and delimiters
      [/[{}()[]]/, '@brackets'],
      [/[;,.]/, 'delimiter'],

      // Identifiers
      [/[a-zA-Z_]\w*/, 'identifier'],
    ],

    comment: [
      [/[^/*]+/, 'comment'],
      [/\*\//, 'comment', '@pop'],
      [/[/*]/, 'comment'],
    ],

    string_double: [
      [/[^\\"]+/, 'string'],
      [/\\./, 'string.escape'],
      [/"/, 'string', '@pop'],
    ],

    string_single: [
      [/[^\\']+/, 'string'],
      [/\\./, 'string.escape'],
      [/'/, 'string', '@pop'],
    ],
  },
  includeLF: false,
};
