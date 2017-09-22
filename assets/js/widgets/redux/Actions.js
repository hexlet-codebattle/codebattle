import { createActions } from 'reduxsauce';

export const { Types: EditorTypes, Creators: EditorActions } = createActions({
  // Fix me
  sendPlayerCode: ['userId', 'value'],
  updateEditorData: ['userId', 'editorText'],
});

export const { Types: UserTypes, Creators: UserActions } = createActions({
  setCurrentUser: ['currentUserId'],
  updateUsers: ['users'],
});
