import React from 'react';
import { useSelector } from 'react-redux';

import Editor from './Editor';
import { currentUserIdSelector, getSolution } from '../selectors';

const StairwayEditorContainer = ({ playerId }) => {
  const editable = useSelector(currentUserIdSelector) === playerId;
  const solution = useSelector(getSolution(playerId));
  // const toolbarParams = {};

  return (
    <>
      <Editor
        value={solution.text.editorText}
        editable={editable}
        syntax={solution.text.activeLangSlug}
        onChange={() => {}}
        checkResult={() => {}}
        mode="default"
        theme="vs-dark"
      />
    </>
);
};

export default StairwayEditorContainer;
