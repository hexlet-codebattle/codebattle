import React from 'react';
import { useSelector } from 'react-redux';

import _ from 'lodash';
import Editor from './Editor';
import { currentUserIdSelector } from '../selectors';
import EditorToolbar from './EditorsToolbars/EditorToolbar';

const StairwayEditorContainer = ({ currentUserId, currentTaskId, editorValues }) => {
    const editorValue = _.find(editorValues, { taskId: currentTaskId }, null);
    const editable = useSelector(currentUserIdSelector) === currentUserId;
    const toolbarParams = {};

    if (editorValue === null) {
        throw new Error('invalid currentTaskId');
    }

  return (
    <>
      {/* <EditorToolbar
        {...toolbarParams}
        toolbarClassNames="btn-toolbar justify-content-between align-items-center m-1"
        editorSettingClassNames="btn-group align-items-center m-1"
        userInfoClassNames="btn-group align-items-center justify-content-end m-1"
      /> */}
      <Editor
        value={editorValue.editorText}
        editable={editable}
        syntax="javascript"
        onChange={() => {}}
        checkResult={() => {}}
        mode="default"
        theme="vs-dark"
      />
    </>
);
};

export default StairwayEditorContainer;
