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

const editorsMetaSelector = state => state.editor.meta;
const editorTextsSelector = state => state.editor.text;

export const editorDataSelector = userId => (state) => {
  const meta = editorsMetaSelector(state)[userId];
  const editorTexts = editorTextsSelector(state);
  if (!meta) {
    return null;
  }
  const text = editorTexts[makeEditorTextKey(userId, meta.currentLangSlug)];
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

export const currentPlayerTextByLangSelector = lang => (state) => {
  const { id: userId } = currentUserSelector(state);
  const editorTexts = editorTextsSelector(state);
  return editorTexts[makeEditorTextKey(userId, lang)];
};

export const userLangSelector = userId => state => _.get(editorDataSelector(userId)(state), 'currentLangSlug', null);

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

export const executionOutputSelector = userId => state => state.executionOutput[userId];

export const firstExecutionOutputSelector = (state) => {
  const userId = firstUserSelector(state).id;
  return executionOutputSelector(userId)(state);
};

export const secondExecutionOutputSelector = (state) => {
  const userId = secondUserSelector(state).id;
  return executionOutputSelector(userId)(state);
};

export const leftExecutionOutputSelector = (state) => {
  const currentUser = currentUserSelector(state);
  const selector = (currentUser.type !== userTypes.secondPlayer)
    ? firstExecutionOutputSelector
    : secondExecutionOutputSelector;
  return selector(state);
};

export const rightExecutionOutputSelector = (state) => {
  const currentUser = currentUserSelector(state);
  const selector = (currentUser.type === userTypes.secondPlayer)
    ? firstExecutionOutputSelector
    : secondExecutionOutputSelector;
  return selector(state);
};
