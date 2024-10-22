import {
  useMemo, useState, useEffect, useCallback,
} from 'react';

import pick from 'lodash/pick';

import editorUserTypes from '../config/editorUserTypes';
import * as RoomActions from '../middlewares/Room';

const useCursorUpdates = (editor, monaco, props) => {
  const params = useMemo(
    () => pick(props, ['userId', 'roomMode']),

    // eslint-disable-next-line react-hooks/exhaustive-deps
    [props.userId, props.roomMode],
  );
  const [, setRemoteKeys] = useState([]);
  const [remote, setRemote] = useState({
    cursor: {},
    selection: {},
  });

  const updateRemoteCursorPosition = useCallback(offset => {
    const { readOnly, userType } = editor.getRawOptions();

    const position = editor.getModel().getPositionAt(offset);
    const userClassName = userType === editorUserTypes.opponent
      ? 'cb-remote-opponent'
      : 'cb-remote-player';

    if (readOnly) {
      const cursor = {
        range: new monaco.Range(
          position.lineNumber,
          position.column,
          position.lineNumber,
          position.column,
        ),
        options: { className: `cb-editor-remote-cursor ${userClassName}` },
      };

      setRemote(oldRemote => ({
        ...oldRemote,
        cursor,
      }));
    }
  }, [setRemote, editor, monaco]);

  const updateRemoteCursorSelection = useCallback((startOffset, endOffset) => {
    const { readOnly, userType } = editor.getRawOptions();

    const userClassName = userType === editorUserTypes.opponent
      ? 'cb-remote-opponent'
      : 'cb-remote-player';

    if (readOnly) {
      const startPosition = editor.getModel().getPositionAt(startOffset);
      const endPosition = editor.getModel().getPositionAt(endOffset);

      const startColumn = startPosition.column;
      const startLineNumber = startPosition.lineNumber;
      const endColumn = endPosition.column;
      const endLineNumber = endPosition.lineNumber;

      const selection = {
        range: new monaco.Range(
          startLineNumber,
          startColumn,
          endLineNumber,
          endColumn,
        ),
        options: { className: `cb-editor-remote-selection ${userClassName}` },
      };

      setRemote(prevRemote => ({
        ...prevRemote,
        selection,
      }));
    }
  }, [setRemote, editor, monaco]);

  useEffect(() => {
    if (remote.cursor.range && remote.selection.range) {
      setRemoteKeys(oldRemoteKeys => (
        editor.deltaDecorations(oldRemoteKeys, Object.values(remote))
      ));
    }
  }, [editor, remote, setRemoteKeys]);

  useEffect(() => {
    const clearCursorListeners = RoomActions.addCursorListeners(
      params,
      updateRemoteCursorPosition,
      updateRemoteCursorSelection,
    );

    return clearCursorListeners;
  }, [
    params,
    updateRemoteCursorPosition,
    updateRemoteCursorSelection,
  ]);
};

export default useCursorUpdates;
