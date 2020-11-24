import React from 'react';
import { useDispatch } from 'react-redux';
import { compressEditorHeight, expandEditorHeight } from '../../middlewares/Game';

const EditorHeightButtons = ({ editor: { userId } }) => {
  const dispatch = useDispatch();
  const compressEditor = userID => () => dispatch(compressEditorHeight(userID));
  const expandEditor = userID => () => dispatch(expandEditorHeight(userID));

  return (
    <div className="mx-1" role="group" aria-label="Editor height">
      <button
        type="button"
        className="btn btn-sm btn-light border rounded"
        onClick={compressEditor(userId)}
      >
        <i className="fas fa-compress-arrows-alt" aria-hidden="true" />
      </button>
      <button
        type="button"
        className="btn btn-sm btn-light border rounded ml-2"
        onClick={expandEditor(userId)}
      >
        <i className="fas fa-expand-arrows-alt" aria-hidden="true" />
      </button>
    </div>
  );
};

export default EditorHeightButtons;
