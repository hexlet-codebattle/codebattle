import React, { useState, useContext } from 'react';
import _ from 'lodash';
import { useSelector } from 'react-redux';
import GameContext from './GameContext';
import * as selectors from '../selectors';
import EditorContainer from './EditorContainer';
import OutputClicker from './OutputClicker';
import editorModes from '../config/editorModes';
import editorUserTypes from '../config/editorUserTypes';


const GameWidget = ({ editorMachine }) => {
  const currentUserId = useSelector(selectors.currentUserIdSelector);
  const { current: gameCurrent } = useContext(GameContext);

  const leftEditor = useSelector(selectors.leftEditorSelector(gameCurrent));
  const rightEditor = useSelector(selectors.rightEditorSelector(gameCurrent));
  const leftUserId = _.get(leftEditor, ['userId'], null);
  const rightUserId = _.get(rightEditor, ['userId'], null);
  const leftUserType = currentUserId === leftUserId
    ? editorUserTypes.currentUser
    : editorUserTypes.player;
  const rightUserType = leftUserType === editorUserTypes.currentUser
    ? editorUserTypes.opponent
    : editorUserTypes.player;

  const leftEditorHeight = useSelector(selectors.editorHeightSelector(gameCurrent, leftUserId));
  const rightEditorHeight = useSelector(selectors.editorHeightSelector(gameCurrent, rightUserId));
  const leftEditorsMode = useSelector(selectors.editorsModeSelector(leftUserId));
  const theme = useSelector(selectors.editorsThemeSelector(leftUserId));

  return (
    <>
      <EditorContainer
        id={leftUserId}
        editorMachine={editorMachine}
        renderOutput={false}
        type={leftUserType}
        orientation="left"
        editorState={leftEditor}
        cardClassName="card h-100 position-relative"
        theme={theme}
        editorHeight={leftEditorHeight}
        editorMode={leftEditorsMode}
      >
      </EditorContainer>
      <EditorContainer
        id={rightUserId}
        editorMachine={editorMachine}
        renderOutput={true}
        type={rightUserType}
        orientation="right"
        editorState={rightEditor}
        cardClassName="card h-100"
        theme={theme}
        editorHeight={rightEditorHeight}
        editorMode={editorModes.default}
      >
      </EditorContainer>
      <OutputClicker />
    </>
  );
};

export default GameWidget;
