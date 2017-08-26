import { createActions } from 'reduxsauce';

export const { Types: EditorTypes, Creators: EditorActions } = createActions({
  sendPlayerCode: ['userId', 'value'],
});
