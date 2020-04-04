import React from 'react';
import cn from 'classnames';
import _ from 'lodash';
import { useSelector, useDispatch } from 'react-redux';
import { compressEditorHeight, expandEditorHeight } from '../../middlewares/Game';
import * as selectors from '../../selectors';

const editorSelector = {
  left: state => _.get(selectors.leftEditorSelector(state), ['userId'], null),
  right: state => _.get(selectors.rightEditorSelector(state), ['userId'], null),
};
const renderEditorHeightButtons = ({ typeEditor }) => {
  const leftUserId = useSelector(editorSelector[typeEditor]);
  const dispatch = useDispatch();
  const compressEditor = userId => () => dispatch(compressEditorHeight(userId));
  const expandEditor = userId => () => dispatch(expandEditorHeight(userId));
  const editorClassNames = cn('btn-group btn-group-sm', {
    'ml-2': typeEditor === 'left',
    'mr-2': typeEditor === 'right',
  });

  return (
    <div className={editorClassNames} role="group" aria-label="Editor height">
      <button
        type="button"
        className="btn btn-sm btn-light border rounded"
        onClick={compressEditor(leftUserId)}
      >
        <i className="fas fa-compress-arrows-alt" aria-hidden="true" />
      </button>
      <button
        type="button"
        className="btn btn-sm btn-light border rounded ml-2"
        onClick={expandEditor(leftUserId)}
      >
        <i className="fas fa-expand-arrows-alt" aria-hidden="true" />
      </button>
    </div>
  );
};

export default renderEditorHeightButtons;
