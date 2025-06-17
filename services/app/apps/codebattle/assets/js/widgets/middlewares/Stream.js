import Gon from 'gon';

import { channelTopics } from '../../socket';
import { actions } from '../slices';

import Channel from './Channel';

const tournamentId = Gon.getAsset('tournament_id');

const channel = new Channel();

const establishStream = dispatch => {
  const getDispatchActionHandler = actionCreator => data => dispatch(actionCreator(data));

  channel.join().receive('ok', () => {});

  const handleActiveGame = getDispatchActionHandler(actions.setGameId);

  return channel
    .addListener(channelTopics.streamActiveGameSelectedTopic, handleActiveGame)
};

export const connectToStream = () => dispatch => {
  const page = `stream:${tournamentId}`;
  channel.setupChannel(page);
  const currentChannel = establishStream(dispatch);

  return currentChannel;
};