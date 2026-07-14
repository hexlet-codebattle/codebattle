import Gon from 'gon';

const chatId = Gon.getAsset('game_id');
const tournamentId = Gon.getAsset('tournament_id');

const prefixes = {
  page: {
    lobby: 'lobby',
    tournament: 'tournament',
    game: 'game',
  },
  channel: {
    lobby: 'chat:lobby',
    tournament: 'chat:t',
    game: 'chat:g',
  },
};

const getChatTopic = (entityName: string, newChatId = chatId) => {
  if (tournamentId) {
    return `${prefixes[entityName as keyof typeof prefixes].tournament}_${tournamentId}`;
  }
  if (newChatId) {
    return `${prefixes[entityName as keyof typeof prefixes].game}_${newChatId}`;
  }

  return prefixes[entityName as keyof typeof prefixes].lobby;
};

export default getChatTopic;
