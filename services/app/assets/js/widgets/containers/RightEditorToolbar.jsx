import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import _ from 'lodash';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as selectors from '../selectors';
import { compressEditorHeight, expandEditorHeight } from '../middlewares/Game';
import LanguagePicker from '../components/LanguagePicker';
import UserInfo from './UserInfo';
import GameResultIcon from '../components/GameResultIcon';

const renderEditorHeightButtons = (compressEditor, expandEditor, userId) => (
  <div className="btn-group btn-group-sm mr-2" role="group" aria-label="Editor height">
    <button
      type="button"
      className="btn btn-sm btn-light border rounded"
      onClick={compressEditor(userId)}
    >
      <i className="fas fa-compress-arrows-alt" aria-hidden="true" />
    </button>
    <button
      type="button"
      className="btn btn-sm btn-light border rounded ml-2"
      onClick={expandEditor(userId)}
    >
      <i className="fas fa-expand-arrows-alt" aria-hidden="true" />
    </button>
  </div>
);

const renderNameplate = (player = {}, onlineUsers) => {
  const isOnline = _.find(onlineUsers, { id: player.id });

  return (
    <div className="d-flex align-items-center">
      <UserInfo user={player} />
      <div>
        {isOnline ? (
          <FontAwesomeIcon icon="snowman" className="text-success ml-2" />
        ) : (
          <FontAwesomeIcon icon="skull-crossbones" className="text-secondary ml-2" />
        )}
      </div>
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

  const dispatch = useDispatch();
  const compressEditor = userId => () => dispatch(compressEditorHeight(userId));
  const expandEditor = userId => () => dispatch(expandEditorHeight(userId));

  if (rightEditorLangSlug === null) { return null; }

  return (
    <div
      className="py-2 px-3 btn-toolbar justify-content-between align-items-center"
      role="toolbar"
    >
      <GameResultIcon
        className="mr-2"
        resultUser1={_.get(players, [[rightUserId], 'gameResult'])}
        resultUser2={_.get(players, [[leftUserId], 'gameResult'])}
      />
      {renderNameplate(players[rightUserId], onlineUsers)}
      <div className="ml-auto btn-group" role="group" aria-label="Editor settings">
        {renderEditorHeightButtons(compressEditor, expandEditor, rightUserId)}
        <LanguagePicker
          languages={languages}
          currentLangSlug={rightEditorLangSlug}
          onChange={_.noop}
          disabled
        />
      </div>
    </div>
  );
};


export default RightEditorToolbar;
