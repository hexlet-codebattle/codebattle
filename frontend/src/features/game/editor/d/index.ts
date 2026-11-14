// D completions, parameter hints and hovers (../clike) for editors attached by CodeEditor.
// Monaco has no D grammar: D editors use the `cpp` language, so the keywords are D's own.
import { attachTo } from '../clike/providers';
import { D_KEYWORDS, DLANG } from './library';

export const attachD = attachTo({
  id: 'cpp',
  profile: DLANG,
  fence: 'd',
  keywords: D_KEYWORDS,
  snippets: [
    { label: 'foreach (x; xs)', filter: 'foreach', insert: 'foreach (${1:x}; ${2:xs}) {\n\t$0\n}', detail: 'Loop over elements' },
    { label: 'foreach (i, x; xs)', filter: 'foreach', insert: 'foreach (${1:i}, ${2:x}; ${3:xs}) {\n\t$0\n}', detail: 'Loop with the index' },
    { label: 'foreach (i; 0 .. n)', filter: 'foreach', insert: 'foreach (${1:i}; 0 .. ${2:n}) {\n\t$0\n}', detail: 'Counting loop' },
    { label: 'map!(x => …).array', filter: 'map', insert: 'map!(${1:x} => ${2:x})${3:.array}', detail: 'Transform each element' },
    { label: 'filter!(x => …).array', filter: 'filter', insert: 'filter!(${1:x} => ${2:true})${3:.array}', detail: 'Keep matching elements' },
    { label: 'to!string', filter: 'to', insert: 'to!${1:string}', detail: 'Convert (std.conv)' },
  ],
});
