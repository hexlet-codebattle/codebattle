import React from 'react';
import { useSelector } from 'react-redux';
import _ from 'lodash';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as selectors from '../../selectors';
import LanguagePicker from '../../components/LanguagePicker';
import UserInfo from '../UserInfo';
import GameResultIcon from '../../components/GameResultIcon';
import EditorHeightButtons from './EditorHeightButtons';
import TypingIcon from './TypingIcon';

const renderNameplate = (player = {}, onlineUsers, editor) => {
  const isOnline = _.find(onlineUsers, { id: player.id });

  return (
    <div className="d-none d-xl-flex align-items-center">
      <UserInfo user={player} />
      <div>
        {isOnline ? (
          <FontAwesomeIcon icon="snowman" className="text-success ml-2" />
        ) : (
          <FontAwesomeIcon icon="skull-crossbones" className="text-secondary ml-2" />
        )}
      </div>
      <TypingIcon editor={editor} />
    </div>
  );
};

const RightEditorToolbar = () => {
  const rightUserId = useSelector(state => _.get(selectors.rightEditorSelector(state), ['userId'], null));
  const leftUserId = useSelector(state => _.get(selectors.leftEditorSelector(state), ['userId'], null));
  const languages = useSelector(state => selectors.editorLangsSelector(state));
  const onlineUsers = useSelector(state => selectors.chatUsersSelector(state));
  const rightEditorLangSlug = useSelector(state => selectors.userLangSelector(rightUserId)(state));
  const players = useSelector(state => selectors.gamePlayersSelector(state));
  const rightEditor = useSelector(state => selectors.rightEditorSelector(state));

  if (rightEditorLangSlug === null) { return null; }

  return (
    <div
      className="py-2 px-3 btn-toolbar justify-content-between align-items-center"
      role="toolbar"
    >
      <GameResultIcon
        className="mr-2"
        resultUser1={_.get(players, [rightUserId, 'gameResult'])}
        resultUser2={_.get(players, [leftUserId, 'gameResult'])}
      />
      {renderNameplate(players[rightUserId], onlineUsers, rightEditor)}
      <div className="ml-auto btn-group" role="group" aria-label="Editor settings">
        <EditorHeightButtons
          typeEditor="right"
        />
        <LanguagePicker
          languages={languages}
          currentLangSlug={rightEditorLangSlug}
          onChangeLang={_.noop}
          disabled
        />
      </div>
    </div>
  );
};

export default RightEditorToolbar;
