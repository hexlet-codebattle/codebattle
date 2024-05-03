import Gon from 'gon';
import { camelizeKeys } from 'humps';
import { Presence } from 'phoenix';

import socket from '../../socket';
import { actions } from '../slices';

const players = Gon.getAsset('players') || [];
const currentUser = Gon.getAsset('current_user') || {};

const mapViewerStateToWeight = {
  online: 0,
  lobby: 1,
  task: 2,
  tournament: 3,
  watching: 4,
  playing: 5,
};

const getMajorState = metas => (
  metas.reduce((state, item) => (
    mapViewerStateToWeight[state] > mapViewerStateToWeight[item.state]
      ? state
      : item.state
  ), 'online')
);

const getUserStateByPath = () => {
  const { pathname } = document.location;

  if (pathname.startsWith('/tournament')) {
    return ({ state: 'tournament' });
  }

  if (pathname.startsWith('/games')) {
    const state = players.some(player => player.id === currentUser.id) ? 'playing' : 'watching';

    return ({
      state,
    });
  }

  if (pathname === '/') {
    return ({
      state: 'lobby',
    });
  }

  if (pathname.startsWith('/tasks')) {
    return ({
      state: 'task',
    });
  }

  return { state: 'online' };
};

const channel = socket.channel('main', getUserStateByPath());
const presence = new Presence(channel);

const listBy = (id, { metas: [first, ...rest] }) => {
  const userInfo = {
    ...first,
    id: Number(id),
    count: rest.length + 1,
    currentState: getMajorState([first, ...rest]),
  };

  return userInfo;
};

const camelizeKeysAndDispatch = (dispatch, actionCreator) => data => (
  dispatch(actionCreator(camelizeKeys(data)))
);

const initPresence = () => dispatch => {
  presence.onSync(() => {
    const list = presence.list(listBy);
    camelizeKeysAndDispatch(dispatch, actions.syncPresenceList)(list);
  });

  channel
    .join()
    .receive(
      'ok',
      () => { camelizeKeysAndDispatch(dispatch, actions.syncPresenceList); },
    );

  channel.onError(() => dispatch(actions.updateMainChannelState(false)));
};

export const changePresenceState = state => () => {
  channel.push('change_presence_state', { state });
};

export const changePresenceUser = user => () => {
  channel.push('change_presence_user', { user });
};

export default initPresence;
