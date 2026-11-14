// C++ completions, parameter hints and hovers (../clike) for editors attached by CodeEditor.
// D editors share Monaco's `cpp` language; each attachment answers only for its own models.
import { attachTo } from '../clike/providers';
import { CPP, STD_PLAIN_TYPES } from './stdlib';

export const attachCpp = attachTo({
  id: 'cpp',
  profile: CPP,
  plainTypes: STD_PLAIN_TYPES,
  fence: 'cpp',
  snippets: [
    { label: 'for (int i = 0; i < n; i++)', filter: 'for', insert: 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t$0\n}', detail: 'Counting loop' },
    { label: 'for (auto& x : v)', filter: 'for', insert: 'for (auto& ${1:x} : ${2:v}) {\n\t$0\n}', detail: 'Range-based loop' },
    { label: 'all(v)', filter: 'all', insert: '${1:v}.begin(), ${1:v}.end()', detail: 'v.begin(), v.end()' },
    {
      label: 'sort with comparator',
      filter: 'sort',
      insert: 'sort(${1:v}.begin(), ${1:v}.end(), [](const auto& a, const auto& b) { return ${2:a < b}; });',
      detail: 'sort(begin, end, lambda)',
    },
    {
      label: 'priority_queue min-heap',
      filter: 'priority_queue',
      insert: 'priority_queue<${1:int}, vector<${1:int}>, greater<${1:int}>> ${2:pq};',
      detail: 'Smallest element on top',
    },
    { label: 'lambda', filter: 'lambda', insert: 'auto ${1:f} = [&](${2:int x}) {\n\t$0\n};', detail: 'auto f = [&](…) { … };' },
  ],
});
