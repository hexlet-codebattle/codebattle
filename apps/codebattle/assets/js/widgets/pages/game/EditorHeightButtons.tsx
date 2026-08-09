import React from 'react';

import { ActionIcon, Group } from '@mantine/core';
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
    <Group mx="xs" gap="sm" wrap="nowrap" role="group" aria-label={i18n.t('Editor height')}>
      <ActionIcon
        variant="default"
        size="sm"
        onClick={compressEditor(userId)}
        aria-label={i18n.t('Compress editor')}
      >
        <i className="fas fa-compress-arrows-alt" aria-hidden="true" />
      </ActionIcon>
      <ActionIcon
        variant="default"
        size="sm"
        onClick={expandEditor(userId)}
        aria-label={i18n.t('Expand editor')}
      >
        <i className="fas fa-expand-arrows-alt" aria-hidden="true" />
      </ActionIcon>
    </Group>
  );
}

export default EditorHeightButtons;
