import { Socket } from 'phoenix';
import getVar from './lib/phxVariables';

function configureSocket() {
  const socket = new Socket('/ws', {
    params: { token: getVar('user_token') },
    logger: (kind, msg, data) => { console.log(`${kind}: ${msg}`, data); }
  });

  socket.connect();

  return socket;
}

const socket = configureSocket();

export default socket;
