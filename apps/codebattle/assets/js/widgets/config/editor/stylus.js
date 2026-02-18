import tagKeywords from "./tagKeywords";

export const language = {
  tagKeywords,
  keywords: [
    "true",
    "false",
    "null",
    "return",
    "else",
    "for",
    "unless",
    "if",
    "else",
    "arguments",
    // "!important",
    "in",
    // "is defined",
    // "is a",
  ],
  brackets: [
    { open: "{", close: "}", token: "delimiter.curly" },
    { open: "[", close: "]", token: "delimiter.bracket" },
    { open: "(", close: ")", token: "delimiter.parenthesis" },
  ],
  digits: /\d+/u,
  escapes: /\\./u,
  tokenizer: {
    root: [
      [/is defined\b/u, "keyword"],
      [/is a\b/u, "keyword"],
      [/!important\b/u, "keyword"],
      [/@[\w-]*/u, "keyword"],
      // Mixin / Function
      [/[a-z][\w-]*(?=\()/u, "tag"],
      // identifiers
      [
        /[$\-_a-z][\w$-]*/u,
        {
          cases: {
            "@keywords": "keyword",
            "@tagKeywords": "tag",
            "@default": "identifier",
          },
        },
      ],
      // ID selector
      [/#[a-z][\w-]*/u, "tag"],
      // Class selector
      [/\.[a-z][\w-]*/u, "tag"],

      [/[,;]/u, "delimiter"],
      [/[()[\]{}]/u, "@brackets"],

      // numbers
      { include: "@numbers" },

      // whitespace
      [/[\t\n\f\r ]+/u, ""],
      { include: "@comments" },

      // strings
      { include: "@strings" },
    ],
    numbers: [
      [/(@digits)[Ee]([+-]?(@digits))?/u, "attribute.value.number", "@units"],
      [/(@digits)\.(@digits)([Ee][+-]?(@digits))?/u, "attribute.value.number", "@units"],
      [/(@digits)/u, "attribute.value.number", "@units"],
      [/#[\dA-Fa-f]{3}([\dA-Fa-f]([\dA-Fa-f]{2}){0,2})?\b(?!-)/u, "attribute.value.hex"],
    ],
    comments: [
      [/\/\*/u, "comment", "@commentBody"],
      [/\/\/.*$/u, "comment"],
    ],
    strings: [
      [/"([^"\\]|\\.)*$/u, "string.invalid"], // non-teminated string
      [/'([^'\\]|\\.)*$/u, "string.invalid"], // non-teminated string
      [/"/u, "string", "@stringDoubleBody"],
      [/'/u, "string", "@stringSingleBody"],
    ],

    commentBody: [
      [/[^*/]+/u, "comment"],
      [/\*\//u, "comment", "@pop"],
      [/[*/]/u, "comment"],
    ],
    stringDoubleBody: [
      [/[^"\\]+/u, "string"],
      [/@escapes/u, "string.escape"],
      [/\\./u, "string.escape.invalid"],
      [/"/u, "string", "@pop"],
    ],
    stringSingleBody: [
      [/[^'\\]+/u, "string"],
      [/@escapes/u, "string.escape"],
      [/\\./u, "string.escape.invalid"],
      [/'/u, "string", "@pop"],
    ],
    units: [
      [
        /((em|ex|ch|rem|vmin|vmax|vw|vh|vm|cm|mm|in|px|pt|pc|deg|grad|rad|turn|s|ms|Hz|kHz|%)\b)?/u,
        "attribute.value.unit",
        "@pop",
      ],
    ],
  },
};

export default language;
