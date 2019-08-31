import { Socket } from 'phoenix';
import Gon from 'gon';

const socket = new Socket('/ws', {
  params: { token: Gon.getAsset('user_token') },
  logger: (kind, msg, data) => { console.log(`${kind}: ${msg}`, data); },
});

socket.connect();

socket.onOpen((ev) => console.log('SOCKET OPEN', ev));
socket.onError((ev) => console.log('SOCKET ERROR', ev));
socket.onClose((ev) => console.log('SOCKET CLOSE', ev));

export default socket;
