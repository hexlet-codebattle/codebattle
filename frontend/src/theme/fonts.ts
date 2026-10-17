// Self-hosted fonts (bundled by Vite and served from our origin), so no visitor IP goes to
// Google Fonts. Same families/weights the Google Fonts link loaded; unicode-range keeps the
// browser fetching only the subsets a page needs (latin, cyrillic…).
import '@fontsource/source-code-pro/400.css';
import '@fontsource/source-code-pro/500.css';
import '@fontsource/source-code-pro/600.css';
import '@fontsource/source-code-pro/800.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
