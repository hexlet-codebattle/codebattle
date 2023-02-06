import React from 'react';
import { useSelector } from 'react-redux';
import _ from 'lodash';

import Editor from './Editor';
import { currentUserIdSelector } from '../selectors';

const StairwayEditorContainer = ({ playerId }) => {
  const editable = useSelector(currentUserIdSelector) === playerId;
  // TODO: create selector
  const playerData = useSelector(state => _.find(state.stairwayGame.game?.players, { id: playerId }));

  if (!playerData) {
    return null;
  }
  return (
    <Editor
      value={playerData.editorText}
      editable={editable}
      syntax={playerData.editorLang}
      onChange={() => {}}
      checkResult={() => {}}
      mode="default"
      theme="vs-dark"
    />
  );
};

export default StairwayEditorContainer;
