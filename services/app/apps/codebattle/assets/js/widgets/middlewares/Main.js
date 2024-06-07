import Gon from 'gon';
import { camelizeKeys } from 'humps';
import { Presence } from 'phoenix';

import { makeGameUrl } from '@/utils/urlBuilders';

import socket from '../../socket';
import { actions } from '../slices';

const players = Gon.getAsset('players') || [];
const currentUser = Gon.getAsset('current_user') || {};

let channel;

const mapViewerStateToWeight = {
  online: 0,
  lobby: 1,
  task: 2,
  tournament: 3,
  watching: 4,
  playing: 5,
};

const getMajorState = metas => metas.reduce(
    (state, item) => (mapViewerStateToWeight[state] > mapViewerStateToWeight[item.state]
        ? state
        : item.state),
    'online',
  );

const getUserStateByPath = () => {
  const { pathname } = document.location;

  if (pathname.startsWith('/tournament')) {
    return { state: 'tournament' };
  }

  if (pathname.startsWith('/games')) {
    const state = players.some(player => player.id === currentUser.id)
      ? 'playing'
      : 'watching';

    return {
      state,
    };
  }

  if (pathname === '/') {
    return {
      state: 'lobby',
    };
  }

  if (pathname.startsWith('/tasks')) {
    return {
      state: 'task',
    };
  }

  return { state: 'online' };
};

const listBy = (id, { metas: [first, ...rest] }) => {
  const userInfo = {
    ...first,
    id: Number(id),
    count: rest.length + 1,
    currentState: getMajorState([first, ...rest]),
  };

  return userInfo;
};

const camelizeKeysAndDispatch = (dispatch, actionCreator) => data => dispatch(actionCreator(camelizeKeys(data)));

const redirectToNewGame = data => (_dispatch, getState) => {
  const { followPaused } = getState().gameUI;

  if (!followPaused) {
    window.location.replace(makeGameUrl(data.activeGameId));
  }
};

const initPresence = followId => dispatch => {
  channel = socket.channel('main', {
    ...getUserStateByPath(),
    follow_id: followId,
  });
  const presence = new Presence(channel);

  presence.onSync(() => {
    const list = presence.list(listBy);
    camelizeKeysAndDispatch(dispatch, actions.syncPresenceList)(list);
  });

  channel.join().receive('ok', () => {
    camelizeKeysAndDispatch(dispatch, actions.syncPresenceList);
  });

  channel.onError(() => dispatch(actions.updateMainChannelState(false)));

  const ref = channel.on('user:game_created', data => {
    camelizeKeysAndDispatch(dispatch, actions.setActiveGameId)(data);
    dispatch(redirectToNewGame(camelizeKeys(data)));
  });

  return () => {
    channel.off('user:game_created', ref);
  };
};

export const changePresenceState = state => () => {
  channel.push('change_presence_state', { state });
};

export const changePresenceUser = user => () => {
  channel.push('change_presence_user', { user });
};

export const followUser = userId => (dispatch, getState) => {
  channel.push('user:follow', { user_id: userId }).receive('ok', payload => {
    const data = camelizeKeys(payload);

    camelizeKeysAndDispatch(dispatch, actions.followUser)(data);

    if (!data.activeGameId) return;

    camelizeKeysAndDispatch(dispatch, actions.setActiveGameId)(data);

    if (data.activeGameId !== getState().game?.gameStatus?.gameId) {
      setTimeout(() => {
        window.location.replace(makeGameUrl(data.activeGameId));
      }, 1000);
    }
  });
};

export const unfollowUser = userId => dispatch => {
  channel.push('user:unfollow', { user_id: userId });
  camelizeKeysAndDispatch(dispatch, actions.unfollowUser)();
};

export default initPresence;
