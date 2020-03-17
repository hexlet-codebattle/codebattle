
const filenames1 = ['aw_yeah.gif', 'coronavirus.png', 'darth_vader.png', 'kirill-hello.gif', 'kirill-love.png'];
const filenames2 = ['kirill.png', 'lebowski.gif', 'troll.png', 'walter_white.jpg'];
const filenames = [...filenames1, ...filenames2];
const dir = '/assets/images/emoji/';

const getName = filename => filename.slice(0, filename.indexOf('.'));

const buildEmoji = filename => {
  const name = getName(filename);
  const imageUrl = `${dir}${filename}`;
  return {
    name,
    short_names: [name],
    text: '',
    emoticons: [],
    colons: `:${name}:`,
    imageUrl,
  };
};

export default filenames.map(buildEmoji);


// export default [
//   {
//     name: 'Octocat',
//     short_names: ['octocat'],
//     text: '',
//     html: true,
//     emoticons: [],
//     colons: ':octocat:',
//     keywords: ['github'],
//     imageUrl: 'https://assets-cdn.github.com/images/icons/emoji/octocat.png?v7',
//   },
//   {
//     name: 'Troll',
//     short_names: ['troll'],
//     text: '',
//     emoticons: [],
//     colons: ':trollface:',
//     keywords: ['troll'],
//     html: true,
//     imageUrl: '/assets/images/emoji/troll.png',
//   },
//   {
//     name: 'Ah_year',
//     short_names: ['ah_yeah'],
//     text: '',
//     colons: ':ahyeah:',
//     emoticons: [],
//     html: false,
//     keywords: ['ah_yeah'],
//     imageUrl: '/assets/images/emoji/aw_yeah.gif',
//   },
// ];
