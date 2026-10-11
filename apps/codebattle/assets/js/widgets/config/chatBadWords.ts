import type { Data } from 'bad-words-next';

// Mild insults missing from the bundled bad-words-next dictionaries (see issue #2361).
// `*` matches any word ending; it is only used where no common word shares the stem.
const chatBadWords: Data = {
  id: 'codebattle',
  words: [
    'dumb',
    'moron*',
    'jerk',
    'jerks',
    'fart',
    'farts',
    'farting',
    'berk',
    'berks',
    'tosser*',
    'dang',
  ],
  lookalike: {},
};

export default chatBadWords;
