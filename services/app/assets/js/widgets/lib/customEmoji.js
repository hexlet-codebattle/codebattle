
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
