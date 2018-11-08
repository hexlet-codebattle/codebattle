import _ from 'lodash';
import userTypes from '../config/userTypes';
import GameStatusCodes from '../config/gameStatusCodes';
import i18n from '../../i18n';
import { makeEditorTextKey } from '../reducers';

export const usersSelector = state => state.user.users;
export const currentUserIdSelector = state => state.user.currentUserId;

export const currentUserSelector = (state) => {
  const user = _.pick(
    usersSelector(state),
    [currentUserIdSelector(state)],
  );
  if (!_.isEmpty(user)) {
    return _.values(user)[0];
  }

  return null;
};

export const firstUserSelector = (state) => {
  const user = _.pickBy(usersSelector(state), { type: userTypes.firstPlayer });
  if (!_.isEmpty(user)) {
    return _.values(user)[0];
  }

  return {};
};

export const secondUserSelector = (state) => {
  const user = _.pickBy(usersSelector(state), { type: userTypes.secondPlayer });
  // FIXME: remove this
  if (!_.isEmpty(user)) {
    return _.values(user)[0];
  }

  return {};
};

const editorsMetaSelector = state => state.editors.meta;
const editorsTextSelector = state => state.editors.text;

export const editorDataSelector = userId => (state) => {
  const meta = editorsMetaSelector(state)[userId] || {currentLang: 'js'};
  const editorText = editorsTextSelector(state);
  const text = editorText[makeEditorTextKey(userId, meta.currentLang)];
  return {
    ...meta,
    text,
  };
};

export const firstEditorSelector = (state) => {
  const userId = firstUserSelector(state).id;
  return editorDataSelector(userId)(state);
};

export const secondEditorSelector = (state) => {
  const userId = secondUserSelector(state).id;
  return editorDataSelector(userId)(state);
};

export const leftEditorSelector = (state) => {
  const currentUser = currentUserSelector(state);
  const editorSelector = (currentUser.type !== userTypes.secondPlayer)
    ? firstEditorSelector
    : secondEditorSelector;
  return editorSelector(state);
};

export const rightEditorSelector = (state) => {
  const currentUser = currentUserSelector(state);
  const editorSelector = (currentUser.type === userTypes.secondPlayer)
    ? firstEditorSelector
    : secondEditorSelector;
  return editorSelector(state);
};

export const userLangSelector = (userId, state) => _.get(editorDataSelector(userId)(state), 'currentLang', null);

export const gameStatusSelector = state => state.game.gameStatus;

export const gameStatusTitleSelector = (state) => {
  const gameStatus = gameStatusSelector(state);
  switch (gameStatus.status) {
    case GameStatusCodes.waitingOpponent:
      return i18n
        .t('{{state}}', { state: i18n.t('Waiting for an opponent') });
    case GameStatusCodes.playing:
      return i18n
        .t('{{state}}', { state: i18n.t('Playing') });
    case GameStatusCodes.gameOver:
      return i18n
        .t('{{name}} won', { name: gameStatus.winner.name });
    default:
      return '';
  }
};

export const gameTaskSelector = state => state.game.task;
export const gameStatusNameSelector = state => state.game.gameStatus.status;

export const gameStartsAtSelector = state => state.game.gameStatus.startsAt;

export const gameLangsSelector = state => state.game.langs;
