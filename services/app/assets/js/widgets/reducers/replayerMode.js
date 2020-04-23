import { createReducer } from '@reduxjs/toolkit';
import * as actions from '../actions';
import ReplayerModes from '../config/ReplayerModes';

const replayerMode = createReducer(ReplayerModes.none, {
  [actions.setReplayerModeOn]() {
    return ReplayerModes.on;
  },
  [actions.serReplayerModeOff]() {
    return ReplayerModes.off;
  }
});

export default replayerMode;
