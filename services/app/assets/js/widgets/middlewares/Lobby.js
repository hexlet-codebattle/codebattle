import { camelizeKeys } from 'humps';
import Gon from 'gon';
import _ from 'lodash';

import socket from '../../socket';
import { actions } from '../slices';

const channelName = 'lobby';
const isRecord = Gon.getAsset('is_record');
const channel = !isRecord ? socket.channel(channelName) : null;

export const fetchState = () => (dispatch, getState) => { // запрос на скачивание первых данных
  const camelizeKeysAndDispatch = actionCreator => data => dispatch(actionCreator(camelizeKeys(data)));

  channel.join().receive('ok', camelizeKeysAndDispatch(actions.initGameList));

  channel.on('game:upsert', data => {
    // настройка коллбеков на конкретные игры
    // есть отдельные ивенты на обновление комплитед геймз - надо их найти
    const newData = camelizeKeys(data);
    const {
      game: { players, id, state: gameState },
    } = newData;
    const currentPlayerId = getState().user.currentUserId;
    const isGameStarted = gameState === 'playing';
    const isCurrentUserInGame = _.some(
      players,
      ({ id: playerId }) => playerId === currentPlayerId, // игра началась
    );

    if (isGameStarted && isCurrentUserInGame) { // добавление игры в active games - неинтересно нам
      window.location.href = `/games/${id}`;
    } else {
      dispatch(actions.upsertGameLobby(newData));
    }
  });

  channel.on('game:check_started', data => { // ивент на старт проверки решения - человек запустил проверку
    const { gameId, userId } = camelizeKeys(data);
    const payload = { gameId, userId, checkResult: { status: 'started' } };

    dispatch(actions.updateCheckResult(payload));
  });

  channel.on(
    'game:check_completed', // это проверка была завершена с каким-то результатом
    camelizeKeysAndDispatch(actions.updateCheckResult),
  );
  channel.on('game:remove', camelizeKeysAndDispatch(actions.removeGameLobby));
  channel.on('game:finish', data => {
    console.log('DATA BACK FINISH CHANNEL ON', data);
    camelizeKeysAndDispatch(actions.finishGame)(data);
  }); // потенциально подходит нам

  // CМ services/app/lib/codebattle_web/channelscamelizeKeysAndDispatch
  // переделать функцию "camelizeKeysAndDispatch"
  // повторить то что она делает, но добавляет эту игру уже в colpleted Games, который в слайсе completedGames
  // нужно два диспатча - один в лобби
  // один в комплтиед геймс - слайс имеется в виду
};

export const cancelGame = gameId => () => {
  channel
    .push('game:cancel', { game_id: gameId })
    .receive('error', error => console.error(error));
};

export const createGame = params => {
  channel
    .push('game:create', params)
    .receive('error', error => console.error(error));
};

export const createInvite = invite => {
  channel
    .push('game:create_invite', invite)
    .receive('error', error => console.error(error));
};

export const acceptInvite = invite => () => {
  channel
    .push('game:accept_invite', invite)
    .receive('error', error => console.error(error));
};

export const declineInvite = invite => () => {
  channel
    .push('game:decline_invite', invite)
    .receive('error', error => console.error(error));
};

export const cancelInvite = invite => () => {
  channel
    .push('game:cancel_invite', invite)
    .receive('error', error => console.error(error));
};
