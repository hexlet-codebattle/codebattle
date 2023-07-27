import { Presence } from 'phoenix';
import Gon from 'gon';
import { camelizeKeys } from 'humps';

import socket from '../../socket';
import { actions } from '../slices';

const players = Gon.getAsset('players') || [];
const currentUser = Gon.getAsset('current_user') || {};

const getMajorState = metas => (
  metas.reduce((state, item) => {
    switch (item.state) {
      case 'playing':
        return ['task'].includes(state) ? state : item.state;
      case 'watching':
        return ['task', 'playing'].includes(state) ? state : item.state;
      case 'task':
        return ['playing', 'watching'].includes(state) ? state : item.state;
      case 'online':
        return ['task', 'playing', 'watching'].includes(state) ? state : item.state;
      default:
        return state;
    }
  }, 'lobby')
);

const getUserStateByPath = () => {
  const { pathname } = document.location;

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
  first.count = rest.length + 1;
  first.id = Number(id);
  first.currentState = getMajorState([first, ...rest]);
  return first;
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
    .receive('ok', () => { camelizeKeysAndDispatch(dispatch, actions.syncPresenceList); });
};

export default initPresence;
