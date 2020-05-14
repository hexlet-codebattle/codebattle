import { createReducer } from '@reduxjs/toolkit';
import * as actions from '../actions';
import ReplayerModes from '../config/replayerModes';

const replayerMode = createReducer(ReplayerModes.none, {
  [actions.setReplayerModeOn]() {
    return ReplayerModes.on;
  },
  [actions.setReplayerModeOff]() {
    return ReplayerModes.off;
  },
});

export default replayerMode;
