import React, { Component } from 'react';
import { connect } from 'react-redux';
import _ from 'lodash';
// import i18n from '../../i18n';
import GameStatusCodes from '../config/gameStatusCodes';
import * as selectors from '../selectors';
import {
  checkGameResult, changeCurrentLangAndSetTemplate, compressEditorHeight, expandEditorHeight,
} from '../middlewares/Game';
import LanguagePicker from '../components/LanguagePicker';
import UserName from '../components/UserName';
import GameResultIcon from '../components/GameResultIcon';

class RightEditorToolbar extends Component {
  static defaultProps = {
    status: GameStatusCodes.initial,
    title: '',
    users: {},
    onlineUsers: [],
  }

renderNameplate = (player = {}, onlineUsers) => {
  const color = _.find(onlineUsers, { id: player.id }) ? 'green' : '#ccc';
  return (
    <div>
      <UserName user={player} />
      <span
        className="fa fa-plug align-middle ml-2"
        style={{ color }}
      />
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
      <i className="fa fa-compress" aria-hidden="true" />
    </button>
    <button
      type="button"
      className="btn btn-sm btn-light border rounded ml-2"
      onClick={() => expandEditor(userId)}
    >
      <i className="fa fa-expand" aria-hidden="true" />
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
    <div className="py-2 px-3 btn-toolbar justify-content-between" role="toolbar">
      <GameResultIcon
        className="mr-2"
        resultUser1={_.get(players, [[rightUserId], 'game_result'])}
        resultUser2={_.get(players, [[leftUserId], 'game_result'])}
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

const mapStateToProps = (state) => {
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
