import { getPageProp } from '@/inertia/pageProps';

import { channelTopics } from '../../socket';
import { actions } from '../slices';

import Channel from './Channel';

const tournamentId = getPageProp('tournament_id');

const channel = new Channel();

const establishStream = (dispatch: any) => {
  const getDispatchActionHandler = (actionCreator: any) => (data: any) =>
    dispatch(actionCreator(data));

  const onJoinSuccess = (response: any) => {
    if (response.activeGameId) {
      dispatch(actions.setGameId({ id: response.activeGameId }));
    }
  };

  const onJoinFailure = (err: any) => {
    console.error(err);
    // window.location.reload();
  };

  channel.join().receive('ok', onJoinSuccess).receive('error', onJoinFailure);

  const handleActiveGame = getDispatchActionHandler(actions.setGameId);

  return channel.addListener(channelTopics.streamActiveGameSelectedTopic, handleActiveGame);
};

const connectToStream = () => (dispatch: any) => {
  const page = `stream:${tournamentId}`;
  channel.setupChannel(page);
  const currentChannel = establishStream(dispatch);

  return currentChannel;
};

export default connectToStream;
