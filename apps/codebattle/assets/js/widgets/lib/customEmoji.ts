interface CustomEmoji {
  name: string;
  short_names: string[];
  text: string;
  emoticons: string[];
  keywords: string[];
  imageUrl: string;
}

const customEmojis: CustomEmoji[] = [
  {
    name: 'Octocat',
    short_names: ['octocat'],
    text: '',
    emoticons: [],
    keywords: ['github'],
    imageUrl: 'https://assets-cdn.github.com/images/icons/emoji/octocat.png?v7',
  },
  {
    name: 'Troll',
    short_names: ['troll'],
    text: '',
    emoticons: [],
    keywords: ['troll'],
    imageUrl: '/assets/images/emoji/troll.png',
  },
  {
    name: 'Ah_year',
    short_names: ['ah_yeah'],
    text: '',
    emoticons: [],
    keywords: ['ah_yeah'],
    imageUrl: '/assets/images/emoji/aw_yeah.gif',
  },
];

export default customEmojis;
