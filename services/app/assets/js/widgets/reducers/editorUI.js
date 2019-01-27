import { handleActions } from 'redux-actions';
import * as actions from '../actions';


const initialState = {
  mode: 'default',
};

const editorUI = handleActions({
  [actions.toggleVimMode](state) {
    return {
      ...state,
      mode: 'vim',
    };
  },
  [actions.toggleDefaultMode](state) {
    return {
      ...state,
      mode: 'default',
    };
  },
}, initialState);

export default editorUI;
