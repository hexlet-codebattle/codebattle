import gameChannel from '../../channels/gameChannel';
import getVar from '../../lib/phxVariables';

export const sendEditorData = (data) => {
  return (dispatch) => {
    gameChannel.push('editor:data', { data })
  };
}
