// assets/js/monaco-bootstrap.js

// 1) wire workers & include monaco css
import "../monaco.setup";
import "monaco-editor/min/vs/editor/editor.main.css";
// Override codicon font path - MUST be after monaco CSS
import "../../css/monaco-codicon-fix.css";

// 2) Import monaco-editor directly
import { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";

// 3) use the @monaco-editor/react loader to configure it with local monaco

import mongodbProvider, { languageConfig as mongodbLangConf } from "./config/editor/mongodb";
import sassProvider from "./config/editor/sass";
import stylusProvider from "./config/editor/stylus";
import zigProvider from "./config/editor/zig";

// Configure loader to use the local monaco instance
loader.config({ monaco });

loader.init().then((monacoInstance) => {
  // Stylus
  monacoInstance.languages.register({ id: "stylus", aliases: ["stylus"] });
  monacoInstance.languages.setMonarchTokensProvider("stylus", stylusProvider);

  // SCSS
  monacoInstance.languages.register({ id: "scss", aliases: ["scss"] });
  monacoInstance.languages.setMonarchTokensProvider("scss", sassProvider);

  // MongoDB
  monacoInstance.languages.register({ id: "mongodb", aliases: ["mongodb"] });
  monacoInstance.languages.setMonarchTokensProvider("mongodb", mongodbProvider);
  monacoInstance.languages.setLanguageConfiguration("mongodb", mongodbLangConf);

  // Zig
  monacoInstance.languages.register({ id: "zig", aliases: ["zig"] });
  monacoInstance.languages.setMonarchTokensProvider("zig", zigProvider);

  // Stream theme: lavender text on black, used by tournament stream kiosk views
  monacoInstance.editor.defineTheme("cb-stream", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "", foreground: "949EF4" },
      { token: "keyword", foreground: "F472B6", fontStyle: "bold" },
      { token: "keyword.control", foreground: "F472B6", fontStyle: "bold" },
      { token: "string", foreground: "C084FC" },
      { token: "string.escape", foreground: "C084FC" },
      { token: "number", foreground: "FBBF24" },
      { token: "comment", foreground: "5B6478", fontStyle: "italic" },
      { token: "type", foreground: "60A5FA" },
      { token: "type.identifier", foreground: "60A5FA" },
      { token: "identifier", foreground: "949EF4" },
      { token: "function", foreground: "FACC15" },
      { token: "operator", foreground: "F87171" },
      { token: "delimiter", foreground: "949EF4" },
      { token: "delimiter.bracket", foreground: "949EF4" },
      { token: "constant", foreground: "FBBF24" },
    ],
    colors: {
      "editor.background": "#000000",
      "editor.foreground": "#949EF4",
      "editorLineNumber.foreground": "#3F3F5C",
      "editorLineNumber.activeForeground": "#949EF4",
      "editor.lineHighlightBackground": "#0A0A14",
      "editor.lineHighlightBorder": "#0A0A14",
      "editorCursor.foreground": "#949EF4",
      "editor.selectionBackground": "#1E1E3F",
      "editor.inactiveSelectionBackground": "#14142A",
      "editorIndentGuide.background": "#1A1A2E",
      "editorIndentGuide.activeBackground": "#3F3F5C",
      "editorWhitespace.foreground": "#1A1A2E",
      "scrollbarSlider.background": "#1E1E3F88",
      "scrollbarSlider.hoverBackground": "#1E1E3FAA",
      "scrollbarSlider.activeBackground": "#1E1E3FCC",
    },
  });
});
