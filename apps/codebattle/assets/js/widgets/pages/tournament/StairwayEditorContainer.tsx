import React from 'react';

import find from 'lodash/find';
import { useSelector } from 'react-redux';

import { type RootState } from '@/slices/store';

import ExtendedEditer from '../../components/ExtendedEditor';
import { currentUserIdSelector } from '../../selectors';

interface StairwayEditorContainerProps {
  playerId: number;
}

interface StairwayPlayerData {
  id: number;
  editorText?: string;
  editorLang?: string;
  [key: string]: unknown;
}

function StairwayEditorContainer({ playerId }: StairwayEditorContainerProps) {
  const editable = useSelector(currentUserIdSelector) === playerId;
  // TODO: create selector
  const playerData = useSelector((state: RootState) =>
    find((state.stairwayGame.game as { players?: StairwayPlayerData[] } | null)?.players, {
      id: playerId,
    }),
  );

  if (!playerData) {
    return null;
  }
  // ExtendedEditor's connected props are typed loosely at the leaf layer (Monaco internals),
  // so the editor props below are not part of its declared prop type.
  const Editor = ExtendedEditer as React.ComponentType<Record<string, unknown>>;
  return (
    <Editor
      value={playerData.editorText}
      editable={editable}
      syntax={playerData.editorLang}
      onChange={() => {}}
      checkResult={() => {}}
      mode="default"
      theme="vs-dark"
    />
  );
}

export default StairwayEditorContainer;
