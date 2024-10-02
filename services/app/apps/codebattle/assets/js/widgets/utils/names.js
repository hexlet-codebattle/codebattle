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

const getChatTopic = (entityName, newChatId = chatId) => {
  if (tournamentId) {
    return `${prefixes[entityName].tournament}_${tournamentId}`;
  }
  if (newChatId) {
    return `${prefixes[entityName].game}_${newChatId}`;
  }

  return prefixes[entityName].lobby;
};

export default getChatTopic;
