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
import LanguagePicker from '../components/LanguagePicker';
import UserName from '../components/UserName';
import WinnerTrophy from '../components/WinnerTrophy';

const renderNameplate = (user = {}, onlineUsers) => {
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

const renderEditorHeightButtons = (compressEditor, expandEditor, userId) => (
  <div className="btn-group btn-group-sm mr-2" role="group" aria-label="Editor height">
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

class RightEditorToolbar extends Component {
  static propTypes = {
    users: PropTypes.shape({
      id: PropTypes.number,
      name: PropTypes.string,
      rating: PropTypes.number,
    }),
  }

  static defaultProps = {
    status: GameStatusCodes.initial,
    title: '',
    users: {},
    onlineUsers: [],
  }

  render() {
    const {
      rightEditorLangSlug,
      rightUserId,
      users,
      onlineUsers,
      gameStatus,
      compressEditor,
      expandEditor,
    } = this.props;

    if (rightEditorLangSlug === null) {
      return null;
    }

    return (
      <div className="btn-toolbar justify-content-between" role="toolbar">
        {renderNameplate(users[rightUserId], onlineUsers)}
        {WinnerTrophy(gameStatus, rightUserId)}
        <div className="btn-group" role="group" aria-label="Editor settings">
          {renderEditorHeightButtons(compressEditor, expandEditor, rightUserId)}
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
  const { users: onlineUsers } = state.chat;

  return {
    users: selectors.usersSelector(state),
    rightUserId,
    onlineUsers,
    rightEditorLangSlug: selectors.userLangSelector(rightUserId)(state),
    gameStatus: selectors.gameStatusSelector(state),
  };
};

const mapDispatchToProps = {
  checkResult: checkGameResult,
  setLang: changeCurrentLangAndSetTemplate,
  compressEditor: compressEditorHeight,
  expandEditor: expandEditorHeight,
};

export default connect(mapStateToProps, mapDispatchToProps)(RightEditorToolbar);
