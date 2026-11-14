// The part of the C++ standard library battle solutions use, written for ../clike/analysis: containers
// with their members, and the free functions of <algorithm>, <numeric>, <cmath>, <string>.
//
// A member or function is `name(params): Return — doc`, a field `name: Type — doc`. In return
// types a container's parameters (T, K, V…) stand for its template arguments, and `$0`, `$1`…
// for the type of that call argument (`max_element(v.begin(), v.end())` returns `$0`, an
// iterator of v). Overloads are separate entries with the same name.

import type { Profile, StdType } from '../clike/analysis';

const SIZE = ['size(): size_t — Number of elements', 'empty(): bool — Whether there are no elements'];
const CLEAR = ['clear(): void — Removes all elements'];
const ITERATE = [
  'begin(): iterator<E> — Iterator to the first element',
  'end(): iterator<E> — Iterator past the last element',
  'rbegin(): iterator<E> — Reverse iterator to the last element',
  'rend(): iterator<E> — Reverse iterator before the first element',
];
const iterate = (element: string) => ITERATE.map((member) => member.replace('<E>', `<${element}>`));

const SEQUENCE = [
  ...SIZE,
  ...CLEAR,
  'push_back(const T& value): void — Appends a copy of value',
  'emplace_back(Args&&... args): T& — Constructs an element in place at the end',
  'pop_back(): void — Removes the last element',
  'front(): T& — The first element',
  'back(): T& — The last element',
  'at(size_t pos): T& — The element at pos, bounds-checked',
  'resize(size_t n): void — Changes the size to n',
  'resize(size_t n, const T& value): void — Changes the size to n, filling new elements with value',
  'assign(size_t n, const T& value): void — Replaces the contents with n copies of value',
  'insert(iterator<T> pos, const T& value): iterator<T> — Inserts value before pos',
  'insert(iterator<T> pos, It first, It last): iterator<T> — Inserts [first, last) before pos',
  'erase(iterator<T> pos): iterator<T> — Removes the element at pos',
  'erase(iterator<T> first, iterator<T> last): iterator<T> — Removes [first, last)',
  'swap(Container& other): void — Exchanges the contents with other',
  ...iterate('T'),
];

const ORDERED_SET = [
  ...SIZE,
  ...CLEAR,
  'insert(const T& value): pair<iterator<T>, bool> — Inserts value if absent',
  'emplace(Args&&... args): pair<iterator<T>, bool> — Constructs an element in place if absent',
  'erase(const T& value): size_t — Removes value, returns how many were removed',
  'erase(iterator<T> pos): iterator<T> — Removes the element at pos',
  'find(const T& value): iterator<T> — Iterator to value, or end()',
  'count(const T& value): size_t — How many elements equal value',
  'contains(const T& value): bool — Whether value is present (C++20)',
  'lower_bound(const T& value): iterator<T> — First element not less than value',
  'upper_bound(const T& value): iterator<T> — First element greater than value',
  ...iterate('T'),
];

const ORDERED_MAP = [
  ...SIZE,
  ...CLEAR,
  'insert(const pair<K, V>& entry): pair<iterator<pair<K, V>>, bool> — Inserts the entry if the key is absent',
  'emplace(Args&&... args): pair<iterator<pair<K, V>>, bool> — Constructs an entry in place if the key is absent',
  'insert_or_assign(const K& key, V value): pair<iterator<pair<K, V>>, bool> — Sets the value for key',
  'try_emplace(const K& key, Args&&... args): pair<iterator<pair<K, V>>, bool> — Constructs the value if key is absent',
  'erase(const K& key): size_t — Removes the entry for key, returns how many were removed',
  'erase(iterator<pair<K, V>> pos): iterator<pair<K, V>> — Removes the entry at pos',
  'find(const K& key): iterator<pair<K, V>> — Iterator to the entry for key, or end()',
  'count(const K& key): size_t — 1 if key is present, else 0',
  'contains(const K& key): bool — Whether key is present (C++20)',
  'at(const K& key): V& — The value for key, throws if absent',
  'lower_bound(const K& key): iterator<pair<K, V>> — First entry with key not less than key',
  'upper_bound(const K& key): iterator<pair<K, V>> — First entry with key greater than key',
  ...iterate('pair<K, V>'),
];

const unordered = (members: string[]) =>
  [
    ...members.filter((member) => !/^(lower_bound|upper_bound|rbegin|rend)\(/.test(member)),
    'reserve(size_t n): void — Reserves space for n elements',
    'bucket_count(): size_t — Number of buckets',
  ];

export const STD_TYPES: Record<string, StdType> = {
  vector: {
    params: ['T'],
    index: 'T',
    element: 'T',
    doc: 'Dynamic array',
    members: [
      ...SEQUENCE,
      'reserve(size_t n): void — Reserves capacity for n elements',
      'capacity(): size_t — Allocated capacity',
      'shrink_to_fit(): void — Frees unused capacity',
      'data(): T* — Pointer to the underlying array',
    ],
  },
  string: {
    params: [],
    index: 'char',
    element: 'char',
    doc: 'String of chars',
    members: [
      ...SEQUENCE.map((member) => member.replaceAll('const T&', 'char').replaceAll('<T>', '<char>').replaceAll('T&', 'char&')),
      'length(): size_t — Number of characters',
      'substr(size_t pos, size_t len = npos): string — The substring [pos, pos + len)',
      'find(const string& s, size_t pos = 0): size_t — First position of s at or after pos, or npos',
      'rfind(const string& s, size_t pos = npos): size_t — Last position of s at or before pos, or npos',
      'find_first_of(const string& chars, size_t pos = 0): size_t — First position of any of chars',
      'find_last_of(const string& chars, size_t pos = npos): size_t — Last position of any of chars',
      'append(const string& s): string& — Appends s',
      'append(size_t n, char c): string& — Appends n copies of c',
      'replace(size_t pos, size_t len, const string& s): string& — Replaces [pos, pos + len) with s',
      'insert(size_t pos, const string& s): string& — Inserts s at pos',
      'erase(size_t pos = 0, size_t len = npos): string& — Removes [pos, pos + len)',
      'compare(const string& s): int — Negative, zero or positive as this is less, equal or greater',
      'starts_with(const string& s): bool — Whether the string starts with s (C++20)',
      'ends_with(const string& s): bool — Whether the string ends with s (C++20)',
      'contains(const string& s): bool — Whether s occurs in the string (C++23)',
      'c_str(): const char* — Null-terminated character array',
      'reserve(size_t n): void — Reserves capacity for n characters',
    ],
  },
  deque: {
    params: ['T'],
    index: 'T',
    element: 'T',
    doc: 'Double-ended queue',
    members: [
      ...SEQUENCE,
      'push_front(const T& value): void — Prepends a copy of value',
      'emplace_front(Args&&... args): T& — Constructs an element in place at the front',
      'pop_front(): void — Removes the first element',
    ],
  },
  list: {
    params: ['T'],
    element: 'T',
    doc: 'Doubly linked list',
    members: [
      ...SEQUENCE.filter((member) => !member.startsWith('at(')),
      'push_front(const T& value): void — Prepends a copy of value',
      'pop_front(): void — Removes the first element',
      'sort(): void — Sorts the list',
      'reverse(): void — Reverses the order',
      'unique(): size_t — Removes consecutive duplicates',
      'splice(iterator<T> pos, list& other): void — Moves all of other before pos',
    ],
  },
  array: {
    params: ['T', 'N'],
    index: 'T',
    element: 'T',
    doc: 'Fixed-size array',
    members: [
      ...SIZE,
      'front(): T& — The first element',
      'back(): T& — The last element',
      'at(size_t pos): T& — The element at pos, bounds-checked',
      'fill(const T& value): void — Sets every element to value',
      'data(): T* — Pointer to the underlying array',
      ...iterate('T'),
    ],
  },
  pair: {
    params: ['A', 'B'],
    doc: 'Two values',
    members: ['first: A — The first value', 'second: B — The second value', 'swap(pair& other): void — Exchanges the contents with other'],
  },
  tuple: { params: [], doc: 'Fixed-size collection of values; read them with get<I>(t) or a structured binding', members: [] },
  map: { params: ['K', 'V'], index: 'V', element: 'pair<K, V>', doc: 'Sorted key → value map', members: ORDERED_MAP },
  multimap: { params: ['K', 'V'], element: 'pair<K, V>', doc: 'Sorted key → value map with repeated keys', members: ORDERED_MAP },
  unordered_map: { params: ['K', 'V'], index: 'V', element: 'pair<K, V>', doc: 'Hash map', members: unordered(ORDERED_MAP) },
  set: { params: ['T'], element: 'T', doc: 'Sorted set of unique values', members: ORDERED_SET },
  multiset: {
    params: ['T'],
    element: 'T',
    doc: 'Sorted multiset',
    members: ORDERED_SET.map((member) =>
      member.replace(/^(insert|emplace)\((.*)\): pair<iterator<T>, bool> — .*/, '$1($2): iterator<T> — Adds an element'),
    ),
  },
  unordered_set: { params: ['T'], element: 'T', doc: 'Hash set', members: unordered(ORDERED_SET) },
  stack: {
    params: ['T'],
    doc: 'LIFO stack',
    members: [
      ...SIZE,
      'push(const T& value): void — Pushes value on top',
      'emplace(Args&&... args): void — Constructs an element in place on top',
      'pop(): void — Removes the top element',
      'top(): T& — The top element',
    ],
  },
  queue: {
    params: ['T'],
    doc: 'FIFO queue',
    members: [
      ...SIZE,
      'push(const T& value): void — Adds value at the back',
      'emplace(Args&&... args): void — Constructs an element in place at the back',
      'pop(): void — Removes the front element',
      'front(): T& — The front element',
      'back(): T& — The back element',
    ],
  },
  priority_queue: {
    params: ['T'],
    doc: 'Heap; the largest element on top (greater<T> as the comparator for the smallest)',
    members: [
      ...SIZE,
      'push(const T& value): void — Inserts value',
      'emplace(Args&&... args): void — Constructs an element in place',
      'pop(): void — Removes the top element',
      'top(): const T& — The largest element (by the comparator)',
    ],
  },
  bitset: {
    params: ['N'],
    index: 'bool',
    doc: 'Fixed-size sequence of bits',
    members: [
      'set(): bitset — Sets all bits',
      'set(size_t pos, bool value = true): bitset — Sets the bit at pos',
      'reset(): bitset — Clears all bits',
      'reset(size_t pos): bitset — Clears the bit at pos',
      'flip(): bitset — Flips all bits',
      'flip(size_t pos): bitset — Flips the bit at pos',
      'test(size_t pos): bool — The bit at pos',
      'count(): size_t — Number of set bits',
      'size(): size_t — Number of bits',
      'any(): bool — Whether any bit is set',
      'none(): bool — Whether no bit is set',
      'all(): bool — Whether every bit is set',
      'to_string(): string — The bits as "0"/"1" characters',
      'to_ulong(): unsigned long — The bits as a number',
      'to_ullong(): unsigned long long — The bits as a number',
    ],
  },
  iterator: { params: ['T'], deref: 'T', doc: 'Iterator', members: [] },
};

/** Types written without template arguments that are still worth suggesting. */
export const STD_PLAIN_TYPES = ['string', 'size_t', 'int64_t', 'uint64_t', 'int32_t', 'uint32_t'];

export const STD_FUNCTIONS = [
  // <algorithm>
  'sort(It first, It last): void — Sorts [first, last) in ascending order',
  'sort(It first, It last, Compare comp): void — Sorts [first, last) by comp',
  'stable_sort(It first, It last): void — Sorts keeping the order of equal elements',
  'stable_sort(It first, It last, Compare comp): void — Sorts by comp keeping the order of equal elements',
  'reverse(It first, It last): void — Reverses [first, last)',
  'unique(It first, It last): $0 — Moves consecutive duplicates to the end; returns the new end',
  'lower_bound(It first, It last, const T& value): $0 — First element not less than value (sorted range)',
  'lower_bound(It first, It last, const T& value, Compare comp): $0 — First element not ordered before value by comp',
  'upper_bound(It first, It last, const T& value): $0 — First element greater than value (sorted range)',
  'upper_bound(It first, It last, const T& value, Compare comp): $0 — First element value is ordered before by comp',
  'binary_search(It first, It last, const T& value): bool — Whether value is in the sorted range',
  'equal_range(It first, It last, const T& value): pair<$0, $0> — The range of elements equal to value',
  'max_element(It first, It last): $0 — Iterator to the largest element',
  'max_element(It first, It last, Compare comp): $0 — Iterator to the largest element by comp',
  'min_element(It first, It last): $0 — Iterator to the smallest element',
  'min_element(It first, It last, Compare comp): $0 — Iterator to the smallest element by comp',
  'minmax_element(It first, It last): pair<$0, $0> — Iterators to the smallest and the largest elements',
  'max(const T& a, const T& b): $0 — The larger of a and b',
  'max(initializer_list<T> values): T — The largest of the values',
  'min(const T& a, const T& b): $0 — The smaller of a and b',
  'min(initializer_list<T> values): T — The smallest of the values',
  'swap(T& a, T& b): void — Exchanges a and b',
  'find(It first, It last, const T& value): $0 — First element equal to value, or last',
  'find_if(It first, It last, Predicate pred): $0 — First element satisfying pred, or last',
  'count(It first, It last, const T& value): size_t — How many elements equal value',
  'count_if(It first, It last, Predicate pred): size_t — How many elements satisfy pred',
  'all_of(It first, It last, Predicate pred): bool — Whether every element satisfies pred',
  'any_of(It first, It last, Predicate pred): bool — Whether some element satisfies pred',
  'none_of(It first, It last, Predicate pred): bool — Whether no element satisfies pred',
  'fill(It first, It last, const T& value): void — Sets every element of [first, last) to value',
  'copy(It first, It last, Out out): Out — Copies [first, last) to out',
  'transform(It first, It last, Out out, Function f): Out — Writes f(x) for each x to out',
  'rotate(It first, It middle, It last): $0 — Rotates so that middle becomes the first element',
  'nth_element(It first, It nth, It last): void — Puts the element that belongs at nth there, smaller before',
  'partition(It first, It last, Predicate pred): $0 — Moves elements satisfying pred to the front',
  'is_sorted(It first, It last): bool — Whether [first, last) is sorted',
  'next_permutation(It first, It last): bool — Rearranges into the next permutation; false after the last',
  'prev_permutation(It first, It last): bool — Rearranges into the previous permutation; false after the first',
  'merge(It first1, It last1, It first2, It last2, Out out): Out — Merges two sorted ranges into out',
  'set_intersection(It first1, It last1, It first2, It last2, Out out): Out — Elements in both sorted ranges',
  'set_union(It first1, It last1, It first2, It last2, Out out): Out — Elements in either sorted range',
  'set_difference(It first1, It last1, It first2, It last2, Out out): Out — Elements of the first range not in the second',
  // <numeric>
  'accumulate(It first, It last, T init): $2 — init plus the sum of [first, last); the type of init is the result type',
  'accumulate(It first, It last, T init, BinaryOp op): $2 — Folds [first, last) into init with op',
  'partial_sum(It first, It last, Out out): Out — Writes the running sums to out',
  'iota(It first, It last, T value): void — Fills with value, value + 1, …',
  'gcd(M m, N n): $0 — Greatest common divisor',
  'lcm(M m, N n): $0 — Least common multiple',
  // <iterator>
  'distance(It first, It last): long — Number of steps from first to last',
  'next(It it, long n = 1): $0 — it advanced by n',
  'prev(It it, long n = 1): $0 — it moved back by n',
  'advance(It& it, long n): void — Moves it by n',
  'back_inserter(Container& c): iterator<T> — Output iterator that push_backs into c',
  // <cmath>, <cstdlib>
  'abs(T x): $0 — Absolute value',
  'pow(double base, double exp): double — base raised to exp',
  'sqrt(double x): double — Square root',
  'cbrt(double x): double — Cube root',
  'floor(double x): double — Largest integer not greater than x',
  'ceil(double x): double — Smallest integer not less than x',
  'round(double x): double — Nearest integer, halves away from zero',
  'log(double x): double — Natural logarithm',
  'log2(double x): double — Base-2 logarithm',
  'log10(double x): double — Base-10 logarithm',
  'exp(double x): double — e raised to x',
  'hypot(double x, double y): double — sqrt(x² + y²)',
  // <string>
  'to_string(T value): string — The number as a string',
  'stoi(const string& s): int — Parses an int',
  'stol(const string& s): long — Parses a long',
  'stoll(const string& s): long long — Parses a long long',
  'stod(const string& s): double — Parses a double',
  'getline(istream& in, string& line): istream& — Reads a line into line',
  'isdigit(int c): bool — Whether c is a decimal digit',
  'isalpha(int c): bool — Whether c is a letter',
  'isalnum(int c): bool — Whether c is a letter or a digit',
  'isupper(int c): bool — Whether c is an uppercase letter',
  'islower(int c): bool — Whether c is a lowercase letter',
  'isspace(int c): bool — Whether c is whitespace',
  'toupper(int c): char — The uppercase form of c',
  'tolower(int c): char — The lowercase form of c',
  // <utility>, <tuple>
  'make_pair(T1 a, T2 b): pair<$0, $1> — A pair of a and b',
  'make_tuple(Args... args): tuple — A tuple of the arguments',
  'tie(Args&... args): tuple — A tuple of references, for unpacking: tie(a, b) = p',
  'move(T&& value): $0 — Casts to an rvalue so the value can be moved from',
  // <cstring>
  'memset(void* dest, int value, size_t bytes): void* — Fills bytes of dest with value',
  // GCC builtins
  '__builtin_popcount(unsigned x): int — Number of set bits',
  '__builtin_popcountll(unsigned long long x): int — Number of set bits',
  '__builtin_clz(unsigned x): int — Number of leading zero bits (x ≠ 0)',
  '__builtin_ctz(unsigned x): int — Number of trailing zero bits (x ≠ 0)',
  '__lg(int x): int — floor(log2(x))',
];

/** Objects and constants: `name: Type — doc`. */
export const STD_VALUES = [
  'cin: istream — Standard input',
  'cout: ostream — Standard output',
  'cerr: ostream — Standard error',
  'endl: ostream& — Newline and flush',
  'INT_MAX: int — 2147483647',
  'INT_MIN: int — -2147483648',
  'LLONG_MAX: long long — 9223372036854775807',
  'LLONG_MIN: long long — -9223372036854775808',
];

export const CPP: Profile = {
  types: STD_TYPES,
  functions: STD_FUNCTIONS,
  values: STD_VALUES,
  statics: {},
  primitives: new Set(['int', 'long', 'short', 'char', 'bool', 'double', 'float', 'void', 'unsigned', 'signed', 'auto', 'wchar_t']),
  otherTypes: new Set([
    'size_t', 'int64_t', 'uint64_t', 'int32_t', 'uint32_t', 'int8_t', 'uint8_t', 'int16_t', 'uint16_t', 'ptrdiff_t',
    'istream', 'ostream', 'greater', 'less', 'function', 'initializer_list', 'optional', 'string_view', 'complex',
  ]),
  namespace: 'std',
  arrowMember: true,
  stringType: 'string',
  arrayMembers: [],
};
