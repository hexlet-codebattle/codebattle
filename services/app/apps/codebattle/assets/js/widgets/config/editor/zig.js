import tagKeywords from "./tagKeywords";

export const language = {
  tagKeywords,

  keywords: [
    "const",
    "var",
    "fn",
    "pub",
    "usingnamespace",
    "comptime",
    "inline",
    "noinline",
    "extern",
    "export",
    "threadlocal",
    "volatile",
    "switch",
    "if",
    "else",
    "while",
    "for",
    "continue",
    "break",
    "return",
    "defer",
    "errdefer",
    "try",
    "catch",
    "asm",
    "struct",
    "enum",
    "union",
    "opaque",
    "orelse",
    "and",
    "or",
    "xor",
    "not",
    "test",
    "anytype",
    "anyframe",
    "nosuspend",
    // legacy / rarely used but harmless to include:
    "await",
    "resume",
    "suspend",
  ],

  builtintypes: [
    "u8",
    "u16",
    "u32",
    "u64",
    "u128",
    "usize",
    "i8",
    "i16",
    "i32",
    "i64",
    "i128",
    "isize",
    "f16",
    "f32",
    "f64",
    "f128",
    "bool",
    "void",
    "noreturn",
    "type",
    "anytype",
    "anyerror",
    "comptime_int",
    "comptime_float",
    "c_char",
    "c_short",
    "c_ushort",
    "c_int",
    "c_uint",
    "c_long",
    "c_ulong",
    "c_longlong",
    "c_ulonglong",
    "c_longdouble",
    "c_void",
  ],

  operators: [
    "=",
    "==",
    "!=",
    ">=",
    "<=",
    ">",
    "<",
    "+",
    "-",
    "*",
    "/",
    "%",
    "++",
    "+=",
    "-=",
    "*=",
    "/=",
    "%=",
    "&",
    "|",
    "^",
    "~",
    "<<",
    ">>",
    "&&",
    "||",
    "!",
    "..",
    "..=",
    "?",
    "?.",
    ".",
    ",",
    ":",
    ";",
  ],

  numbers:
    /-?(?:0x[0-9a-fA-F_]+|0b[01_]+|0o[0-7_]+|[0-9][0-9_]*(?:\.[0-9_]+)?(?:[eE][+-]?[0-9_]+)?)/,

  tokenizer: {
    root: [
      { include: "@whitespace" },

      // Builtins like @sizeOf, @import, etc.
      [/@[a-zA-Z_][a-zA-Z0-9_]*/, "predefined"],

      // Operators
      [/<<|>>|<=|>=|==|!=|\+\+|\.{2}=|\.{2}|[+\-*/%&|^~!=<>?:.]/, "operators"],

      // Identifiers, keywords, and types
      [
        /[a-zA-Z_][a-zA-Z0-9_]*/,
        {
          cases: {
            "@builtintypes": "type",
            "@keywords": "keyword",
            "@default": "",
          },
        },
      ],

      // Delimiters
      [/[()[\]{};,]/, "delimiter"],

      // Numbers
      [/@numbers/, "number"],

      // Strings — all characters are covered by three consecutive groups
      [/(")((?:[^"\\]|\\.)*)(")/, ["string", "string", "string"]],
      [/(')((?:[^'\\]|\\.)*)(')/, ["string", "string", "string"]],
    ],

    comment: [
      [/[^/*]+/, "comment"],
      [/\*\//, "comment", "@pop"],
      [/[\/*]/, "comment"],
    ],

    whitespace: [
      [/[ \t\r\n]+/, "white"],
      [/\/\*/, "comment", "@comment"],
      [/\/\/.*$/, "comment"], // includes //! and /// doc comments
    ],
  },
};

export default language;
