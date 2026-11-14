// Java completions, parameter hints and hovers (../clike) for editors attached by CodeEditor.
import { attachTo } from '../clike/providers';
import { JAVA } from './library';

export const attachJava = attachTo({
  id: 'java',
  profile: JAVA,
  fence: 'java',
  snippets: [
    { label: 'for (int i = 0; i < n; i++)', filter: 'for', insert: 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t$0\n}', detail: 'Counting loop' },
    { label: 'for (var x : xs)', filter: 'for', insert: 'for (var ${1:x} : ${2:xs}) {\n\t$0\n}', detail: 'For-each loop' },
    { label: 'Map<String, Integer> counts', filter: 'Map', insert: 'Map<${1:String}, ${2:Integer}> ${3:counts} = new HashMap<>();', detail: 'New HashMap' },
    { label: 'List<Integer> list', filter: 'List', insert: 'List<${1:Integer}> ${2:list} = new ArrayList<>();', detail: 'New ArrayList' },
    { label: 'System.out.println', filter: 'sout', insert: 'System.out.println($0);', detail: 'Print a line' },
  ],
});
