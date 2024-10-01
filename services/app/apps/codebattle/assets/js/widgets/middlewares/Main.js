import Gon from 'gon';
import { camelizeKeys } from 'humps';

import { makeGameUrl } from '@/utils/urlBuilders';

import { actions } from '../slices';

import Channel from './Channel';

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

const camelizeKeysAndDispatch = (dispatch, actionCreator) => data => dispatch(actionCreator(camelizeKeys(data)));

const redirectToNewGame = data => (_dispatch, getState) => {
  const { followPaused } = getState().gameUI;

  if (!followPaused) {
    window.location.replace(makeGameUrl(data.activeGameId));
  }
};

const initPresence = followId => dispatch => {
  channel = new Channel('main', {
    ...getUserStateByPath(),
    followId,
  });
  channel.syncPresence(
    list => {
      const updatedList = list.map(userInfo => ({
        ...userInfo,
        state: getMajorState(userInfo.userPresence),
      }));
      dispatch(actions.syncPresenceList(updatedList));
    },
  );

  channel.join().receive('ok', () => {
    camelizeKeysAndDispatch(dispatch, actions.syncPresenceList);
  });

  channel.onError(() => dispatch(actions.updateMainChannelState(false)));

  return channel
    .addListener(
      'user:game_created',
      data => {
        camelizeKeysAndDispatch(dispatch, actions.setActiveGameId)(data);
        dispatch(redirectToNewGame(camelizeKeys(data)));
      },
    );
};

export const changePresenceState = state => () => {
  channel.push('change_presence_state', { state });
};

export const changePresenceUser = user => () => {
  channel.push('change_presence_user', { user });
};

export const followUser = userId => (dispatch, getState) => {
  channel.push('user:follow', { userId }).receive('ok', payload => {
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
  channel.push('user:unfollow', { userId });
  camelizeKeysAndDispatch(dispatch, actions.unfollowUser)();
};

export default initPresence;
