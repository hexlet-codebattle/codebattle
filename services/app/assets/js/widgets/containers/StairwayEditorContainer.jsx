import React, { useEffect } from 'react';
import _ from 'lodash';
import { useMachine } from '@xstate/react';
import { useDispatch, useSelector } from 'react-redux';
import * as GameActions from '../middlewares/Game';
import { actions } from '../slices';

import Editor from './Editor';
import { currentUserIdSelector } from '../selectors';

const StairwayEditorContainer = ({ type, editorMachine, playerId }) => {
  const dispatch = useDispatch();
  const editable = useSelector(currentUserIdSelector) === playerId;
  const playerData = useSelector(state => _.find(state.stairwayGame.game?.players, { id: playerId }));

  const context = { playerId, type };

  const config = {
    actions: {
      userStartChecking: () => {
        dispatch(GameActions.checkGameResult());
      },
      handleTimeoutFailureChecking: () => {
        dispatch(actions.updateExecutionOutput({
          playerId,
          status: 'timeout',
          output: '',
          result: {},
          asserts: [],
        }));

        dispatch(actions.updateCheckStatus({ [playerId]: false }));
      },
    },
  };

  const [editorCurrent, send, service] = useMachine(
    editorMachine.withConfig(config),
    {
      context,
      devTools: true,
      id: `editor_${playerId}`,
    },
  );

  useEffect(() => {
    GameActions.connectToEditor(service)(dispatch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!playerData) {
    return null;
  }
  return (
    <Editor
      value={playerData.editorText}
      editable={editable}
      syntax={playerData.editorLang}
      onChange={() => { }}
      checkResult={() => { }}
      mode="default"
      theme="vs-dark"
    />
  );
};

export default StairwayEditorContainer;
