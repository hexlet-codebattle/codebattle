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

const getChatName = (entityName) => {
  if (tournamentId) {
    return `${prefixes[entityName].tournament}_${tournamentId}`;
  }
  if (chatId) {
    return `${prefixes[entityName].game}_${chatId}`;
  }

  return prefixes[entityName].lobby;
};

export default getChatName;
