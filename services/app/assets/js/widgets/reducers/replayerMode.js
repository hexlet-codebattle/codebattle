import { createReducer } from '@reduxjs/toolkit';
import * as actions from '../actions';
import ReplayerModes from '../config/ReplayerModes';

const replayerMode = createReducer(ReplayerModes.none, {
  [actions.setReplayerModeOn]() {
    return ReplayerModes.on;
  },
});

export default replayerMode;
