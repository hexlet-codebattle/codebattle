import { Presence } from 'phoenix';
import { camelizeKeys } from 'humps';

import socket from '../../socket';
import { actions } from '../slices';

const channel = socket.channel('main');
const presence = new Presence(channel);

const listBy = (id, { metas: [first, ...rest] }) => {
  first.count = rest.length + 1;
  first.id = Number(id);
  return first;
};

const camelizeKeysAndDispatch = (dispatch, actionCreator) => data => (
  dispatch(actionCreator(camelizeKeys(data)))
);

export const initPresence = () => dispatch => {
  presence.onSync(() => {
    const list = presence.list(listBy);
    camelizeKeysAndDispatch(dispatch, actions.syncPresenceList)(list);
  });
  
  channel
  .join()
  .receive('ok', () => { camelizeKeysAndDispatch(dispatch, actions.syncPresenceList) });
};
