import React, { type Ref } from 'react';

import { Box, Flex, Group } from '@mantine/core';

import i18n from '../../../i18n';
import LanguagePicker from '../../components/LanguagePicker';
import UserInfo from '../../components/UserInfo';
import GameRoomModes from '../../config/gameModes';
import Placements from '../../config/placements';

// import DarkModeButton from './DarkModeButton';
import CopyEditorButton from './CopyEditorButton';
import EditorResultIcon from './EditorResultIcon';
import GameActionButtons from './GameActionButtons';
import GameBanPlayerButton from './GameBanPlayerButton';
import GameReportButton from './GameReportButton';
import GameResultIcon from './GameResultIcon';
import UserHeadToHead from './UserHeadToHead';
import VimModeButton from './VimModeButton';

import { type Player } from '../../slices/initial';

interface ModeButtonsProps {
  player: Player;
}

function ModeButtons({ player }: ModeButtonsProps) {
  return (
    <Group align="center" mr="auto" role="group" aria-label={i18n.t('Editor mode')}>
      <VimModeButton playerId={player.id} />
      {/* <DarkModeButton playerId={player.id} /> */}
    </Group>
  );
}

interface EditorToolbarEditor {
  userId?: number;
  text?: string;
  currentLangSlug?: string;
  [key: string]: unknown;
}

interface EditorToolbarProps {
  gameId?: number;
  toolbarRef?: Ref<HTMLDivElement>;
  type?: string;
  mode?: string;
  status?: string;
  player: Player;
  editorState?: string;
  tournamentId?: number;
  editor: EditorToolbarEditor;
  langPickerStatus?: string;
  actionBtnsProps?: React.ComponentProps<typeof GameActionButtons>;
  showControlBtns?: boolean;
  hideToolbarControls?: boolean;
  isAdmin?: boolean;
  isHistory?: boolean;
}

function EditorToolbar({
  gameId,
  toolbarRef,
  type,
  mode,
  status,
  player,
  editorState,
  tournamentId,
  editor,
  langPickerStatus,
  actionBtnsProps,
  showControlBtns,
  hideToolbarControls = false,
  isAdmin = false,
  isHistory = false,
}: EditorToolbarProps) {
  return (
    <>
      <Box
        ref={toolbarRef as Ref<HTMLDivElement>}
        className="cb-bg-panel cb-toolbar cb-border-color"
        style={{
          borderTopLeftRadius: 'var(--mantine-radius-sm)',
          borderTopRightRadius: 'var(--mantine-radius-sm)',
        }}
        data-player-type={type}
      >
        <Group justify="space-between" align="center" m="xs" role="toolbar" wrap="wrap">
          <Flex justify="space-between" wrap="nowrap">
            <Group align="center" m="xs" role="group" aria-label={i18n.t('Editor settings')}>
              <LanguagePicker editor={editor} status={langPickerStatus} />
            </Group>
            {showControlBtns && !isHistory && <ModeButtons player={player} />}
          </Flex>

          <Flex justify="space-between" wrap="nowrap">
            {showControlBtns && !isHistory && editorState !== 'banned' && (
              <GameActionButtons
                {...(actionBtnsProps as React.ComponentProps<typeof GameActionButtons>)}
              />
            )}
            {!showControlBtns && !hideToolbarControls && (
              <Group py="sm" role="group" aria-label={i18n.t('Report actions')}>
                <GameReportButton userId={player.id} gameId={gameId as number} />
                {isAdmin && (
                  <>
                    <GameBanPlayerButton
                      userId={player.id}
                      status={status as string}
                      tournamentId={tournamentId as number}
                    />
                    <CopyEditorButton editor={editor as { text: string }} />
                  </>
                )}
              </Group>
            )}
            <Group
              align="center"
              justify="flex-end"
              m="xs"
              role="group"
              aria-label={i18n.t('User info')}
            >
              <UserInfo
                {...({ mode: 'dark' } as Partial<React.ComponentProps<typeof UserInfo>>)}
                user={player}
                placement={
                  Placements.bottomEnd as React.ComponentProps<typeof UserInfo>['placement']
                }
              />
              {mode === GameRoomModes.standard && <UserHeadToHead userId={player.id} />}
            </Group>
          </Flex>
        </Group>
      </Box>
      <EditorResultIcon>
        <GameResultIcon userId={editor.userId as number} />
      </EditorResultIcon>
    </>
  );
}

export default EditorToolbar;
