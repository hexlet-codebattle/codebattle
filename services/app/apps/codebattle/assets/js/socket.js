import Gon from 'gon';
import { Socket } from 'phoenix';

const socket = new Socket('/ws', {
  params: { token: Gon.getAsset('user_token') },
});

socket.connect();

export default socket;
