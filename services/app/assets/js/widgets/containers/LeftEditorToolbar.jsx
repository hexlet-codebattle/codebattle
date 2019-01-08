import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import _ from 'lodash';
// import i18n from '../../i18n';
import GameStatusCodes from '../config/gameStatusCodes';
import * as selectors from '../selectors';
import {
  checkGameResult, changeCurrentLangAndSetTemplate, compressEditorHeight, expandEditorHeight,
} from '../middlewares/Game';
import userTypes from '../config/userTypes';
import LanguagePicker from '../components/LanguagePicker';
import UserName from '../components/UserName';
import GameResultIcon from '../components/GameResultIcon';

class LeftEditorToolbar extends Component {
  static propTypes = {
    users: PropTypes.shape({
      id: PropTypes.number,
      name: PropTypes.string,
      rating: PropTypes.number,
    }),
    status: PropTypes.string,
    title: PropTypes.string,
  }

  static defaultProps = {
    status: GameStatusCodes.initial,
    title: '',
    users: {},
    onlineUsers: [],
  }

  renderNameplate = (user = {}, onlineUsers) => {
    const color = _.find(onlineUsers, { id: user.id }) ? 'green' : '#ccc';
    return (
      <div>
        <UserName user={user} />
        <span
          className="fa fa-plug align-middle ml-2"
          style={{ color }}
        />
      </div>
    );
  };

  renderEditorHeightButtons = (compressEditor, expandEditor, userId) => (
    <div className="btn-group btn-group-sm ml-2" role="group" aria-label="Editor height">
      <button
        type="button"
        className="btn btn-outline-secondary"
        onClick={() => compressEditor(userId)}
      >
        <i className="fa fa-compress" aria-hidden="true" />
      </button>
      <button
        type="button"
        className="btn btn-outline-secondary"
        onClick={() => expandEditor(userId)}
      >
        <i className="fa fa-expand" aria-hidden="true" />
      </button>
    </div>
  );


  render() {
    const {
      currentUser,
      leftEditorLangSlug,
      leftUserId,
      rightUserId,
      users,
      onlineUsers,
      setLang,
      gameStatus,
      players,
      compressEditor,
      expandEditor,
    } = this.props;
    const userType = currentUser.type;
    const isSpectator = userType === userTypes.spectator;

    if (leftEditorLangSlug === null) {
      return null;
    }

    return (
      <div className="btn-toolbar justify-content-between" role="toolbar">
        <div className="btn-group" role="group" aria-label="Editor settings">
          <LanguagePicker
            currentLangSlug={leftEditorLangSlug}
            onChange={setLang}
            disabled={isSpectator}
          />
          {this.renderEditorHeightButtons(compressEditor, expandEditor, leftUserId)}
        </div>
        <GameResultIcon
          resultUser1={_.get(players, [[leftUserId], 'game_result'])}
          resultUser2={_.get(players, [[rightUserId], 'game_result'])}
        />
        {this.renderNameplate(users[leftUserId].user, onlineUsers)}
      </div>
    );
  }
}

const mapStateToProps = (state) => {
  const currentUser = selectors.currentUserSelector(state);
  const leftUserId = _.get(selectors.leftEditorSelector(state), ['userId'], null);
  const rightUserId = _.get(selectors.rightEditorSelector(state), ['userId'], null);
  const { users: onlineUsers } = state.chat;

  return {
    users: selectors.usersSelector(state),
    leftUserId,
    rightUserId,
    currentUser,
    onlineUsers,
    leftEditorLangSlug: selectors.userLangSelector(leftUserId)(state),
    rightEditorLangSlug: selectors.userLangSelector(rightUserId)(state),
    gameStatus: selectors.gameStatusSelector(state),
    players: selectors.gamePlayersSelector(state),
    title: selectors.gameStatusTitleSelector(state),
    task: selectors.gameTaskSelector(state),
  };
};

const mapDispatchToProps = {
  checkResult: checkGameResult,
  setLang: changeCurrentLangAndSetTemplate,
  compressEditor: compressEditorHeight,
  expandEditor: expandEditorHeight,
};

export default connect(mapStateToProps, mapDispatchToProps)(LeftEditorToolbar);
