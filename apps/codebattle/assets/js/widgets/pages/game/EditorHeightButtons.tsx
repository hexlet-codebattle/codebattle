import React from 'react';

import { useDispatch } from 'react-redux';

import i18n from '../../../i18n';
import { compressEditorHeight, expandEditorHeight } from '../../middlewares/Room';
import { type AppDispatch } from '../../slices';

interface EditorHeightButtonsProps {
  editor: { userId: number };
}

function EditorHeightButtons({ editor: { userId } }: EditorHeightButtonsProps) {
  const dispatch = useDispatch<AppDispatch>();
  const compressEditor = (userID: number) => () => dispatch(compressEditorHeight(userID));
  const expandEditor = (userID: number) => () => dispatch(expandEditorHeight(userID));

  return (
    <div className="mx-1" role="group" aria-label={i18n.t('Editor height')}>
      <button
        type="button"
        className="btn btn-sm btn-light border"
        onClick={compressEditor(userId)}
        aria-label={i18n.t('Compress editor')}
      >
        <i className="fas fa-compress-arrows-alt" aria-hidden="true" />
      </button>
      <button
        type="button"
        className="btn btn-sm btn-light border ml-2"
        onClick={expandEditor(userId)}
        aria-label={i18n.t('Expand editor')}
      >
        <i className="fas fa-expand-arrows-alt" aria-hidden="true" />
      </button>
    </div>
  );
}

export default EditorHeightButtons;
