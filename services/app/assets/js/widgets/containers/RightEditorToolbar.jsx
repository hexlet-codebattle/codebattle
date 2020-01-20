import React, { Component } from 'react';
import { connect } from 'react-redux';
import _ from 'lodash';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import GameStatusCodes from '../config/gameStatusCodes';
import * as selectors from '../selectors';
import {
  checkGameResult, changeCurrentLangAndSetTemplate, compressEditorHeight, expandEditorHeight,
} from '../middlewares/Game';
import LanguagePicker from '../components/LanguagePicker';
import UserInfo from './UserInfo';
import GameResultIcon from '../components/GameResultIcon';

class RightEditorToolbar extends Component {
  static defaultProps = {
    status: GameStatusCodes.initial,
    title: '',
    users: {},
    onlineUsers: [],
  };

  renderNameplate = (player = {}, onlineUsers) => {
    const isOnline = _.find(onlineUsers, { id: player.id });

    return (
      <div className="d-flex align-items-center">
        <UserInfo user={player} />
        <div>
          {
            isOnline
              ? <FontAwesomeIcon icon="snowman" className="text-success ml-2" />
              : <FontAwesomeIcon icon="skull-crossbones" className="text-secondary ml-2" />
          }
        </div>
      </div>
    );
  };

  renderEditorHeightButtons = (compressEditor, expandEditor, userId) => (
    <div className="btn-group btn-group-sm mr-2" role="group" aria-label="Editor height">
      <button
        type="button"
        className="btn btn-sm btn-light border rounded"
        onClick={() => compressEditor(userId)}
      >
        <i className="fas fa-compress-arrows-alt" aria-hidden="true" />
      </button>
      <button
        type="button"
        className="btn btn-sm btn-light border rounded ml-2"
        onClick={() => expandEditor(userId)}
      >
        <i className="fas fa-expand-arrows-alt" aria-hidden="true" />
      </button>
    </div>
  );

  render() {
    const {
      rightEditorLangSlug,
      rightUserId,
      leftUserId,
      onlineUsers,
      players,
      compressEditor,
      expandEditor,
    } = this.props;

    if (rightEditorLangSlug === null) {
      return null;
    }

    return (
      <div className="py-2 px-3 btn-toolbar justify-content-between align-items-center" role="toolbar">
        <GameResultIcon
          className="mr-2"
          resultUser1={_.get(players, [[rightUserId], 'gameResult'])}
          resultUser2={_.get(players, [[leftUserId], 'gameResult'])}
        />
        {this.renderNameplate(players[rightUserId], onlineUsers)}
        <div className="ml-auto btn-group" role="group" aria-label="Editor settings">
          {this.renderEditorHeightButtons(compressEditor, expandEditor, rightUserId)}
          <LanguagePicker
            currentLangSlug={rightEditorLangSlug}
            onChange={_.noop}
            disabled
          />
        </div>
      </div>
    );
  }
}

const mapStateToProps = state => {
  const rightUserId = _.get(selectors.rightEditorSelector(state), ['userId'], null);
  const leftUserId = _.get(selectors.leftEditorSelector(state), ['userId'], null);

  return {
    rightUserId,
    leftUserId,
    onlineUsers: selectors.chatUsersSelector(state),
    rightEditorLangSlug: selectors.userLangSelector(rightUserId)(state),
    gameStatus: selectors.gameStatusSelector(state),
    players: selectors.gamePlayersSelector(state),
  };
};

const mapDispatchToProps = {
  checkResult: checkGameResult,
  setLang: changeCurrentLangAndSetTemplate,
  compressEditor: compressEditorHeight,
  expandEditor: expandEditorHeight,
};

export default connect(mapStateToProps, mapDispatchToProps)(RightEditorToolbar);
