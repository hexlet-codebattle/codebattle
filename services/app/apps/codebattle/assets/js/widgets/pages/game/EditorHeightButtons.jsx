import React from 'react';

import { useDispatch } from 'react-redux';

import { compressEditorHeight, expandEditorHeight } from '../../middlewares/Game';

function EditorHeightButtons({ editor: { userId } }) {
  const dispatch = useDispatch();
  const compressEditor = (userID) => () => dispatch(compressEditorHeight(userID));
  const expandEditor = (userID) => () => dispatch(expandEditorHeight(userID));

  return (
    <div aria-label="Editor height" className="mx-1" role="group">
      <button
        className="btn btn-sm btn-light border"
        type="button"
        onClick={compressEditor(userId)}
      >
        <i aria-hidden="true" className="fas fa-compress-arrows-alt" />
      </button>
      <button
        className="btn btn-sm btn-light border ml-2"
        type="button"
        onClick={expandEditor(userId)}
      >
        <i aria-hidden="true" className="fas fa-expand-arrows-alt" />
      </button>
    </div>
  );
}

export default EditorHeightButtons;
