import React, { memo, useState, useCallback, useRef } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  ActionIcon,
  Box,
  Button,
  Flex,
  Group,
  NativeSelect,
  Paper,
  Text,
  Title,
} from '@mantine/core';
import themeList from 'monaco-themes/themes/themelist.json';
import { useSelector } from 'react-redux';

import { spectatorEditorIsChecking, spectatorStateSelector } from '@/machines/selectors';
import useMachineStateSelector from '@/utils/useMachineStateSelector';

import i18n from '../../../i18n';
import ExtendedEditor from '../../components/ExtendedEditor';
import LanguagePickerView from '../../components/LanguagePickerView';
import UserInfo from '../../components/UserInfo';
import Placements from '../../config/placements';
import * as selectors from '../../selectors';
import DakModeButton from '../game/DarkModeButton';
import EditorResultIcon from '../game/EditorResultIcon';
import GameResultIcon from '../game/GameResultIcon';

const fontSizeDefault = Number(
  window.localStorage.getItem('CodebattleSpectatorEditorFontSize') || '20',
);
const setFontSizeDefault = (size: number) =>
  window.localStorage.setItem('CodebattleSpectatorEditorFontSize', String(size));

// const monacoThemeDefault = (
//   window.localStorage.getItem('CodebattleSpectatorEditorMonacoTheme') || 'Amy'
// );
const setMonacoThemeDefault = (theme: string) =>
  window.localStorage.setItem('CodebattleSpectatorEditorMonacoTheme', theme);

interface SpectatorEditorProps {
  hidingControls: boolean;
  handleSwitchHidingControls: () => void;
  playerId: number | null;
  // xstate v4 interpreter; typed loosely per migration conventions.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  spectatorService: any;
  panelClassName?: string;
  style?: React.CSSProperties;
  // Extra props are forwarded from the parent but unused here.
  switchedWidgetsStatus?: boolean;
  handleSwitchWidgets?: () => void;
}

function SpectatorEditor({
  // switchedWidgetsStatus,
  // handleSwitchWidgets,
  hidingControls,
  handleSwitchHidingControls,
  playerId,
  spectatorService,
  panelClassName,
  style,
}: SpectatorEditorProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);

  // const [monacoTheme, setMonacoTheme] = useState(monacoThemeDefault);
  const [monacoTheme, setMonacoTheme] = useState('custom');

  const players = useSelector(selectors.gamePlayersSelector);
  const editorData = useSelector(selectors.editorDataSelector(playerId as number, undefined));
  const currentUserId = useSelector(selectors.currentUserIdSelector);
  const theme = useSelector(selectors.editorsThemeSelector);
  const editorsMode = useSelector(selectors.editorsModeSelector);

  const spectatorEditorState = (
    useMachineStateSelector(spectatorService, spectatorStateSelector) as {
      value: { editor: string };
    }
  ).value.editor;
  const isChecking = useMachineStateSelector(spectatorService, spectatorEditorIsChecking);

  const [fontSize, setFontSize] = useState(fontSizeDefault);
  const handleChangeSize = useCallback(
    (size: number) => {
      setFontSize(size);
      setFontSizeDefault(size);
    },
    [setFontSize],
  );
  const handleChangeMonacoTheme = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setMonacoTheme(e.target.value);
      setMonacoThemeDefault(e.target.value);
      // setFontSize(size);
      // setFontSizeDefault(size);
    },
    [setMonacoTheme],
  );

  const handleIncreaseFontSize = useCallback(
    () => handleChangeSize(Math.min(42, fontSize + 0.5)),
    [handleChangeSize, fontSize],
  );
  const handleDecreaseFontSize = useCallback(
    () => handleChangeSize(Math.max(4, fontSize - 0.5)),
    [handleChangeSize, fontSize],
  );

  const params = {
    userId: spectatorEditorState === 'loading' ? undefined : playerId,
    editable: false,
    syntax: editorData?.currentLangSlug || 'javascript',
    mode: editorsMode,
    loading: spectatorEditorState === 'loading',
    theme,
    mute: true,
    fontSize,
  };

  const editorParams = {
    ...params,
    wordWrap: 'on',
    fontFamily: 'IBM Plex Mono',
    lineNumbers: 'off',
    monacoTheme,
    value: editorData?.text || '',
    onChange: () => {},
  };

  return (
    <Box
      className={panelClassName}
      bg={isChecking ? 'yellow.4' : undefined}
      h="100%"
      p="xs"
      style={style}
      data-editor-state={spectatorEditorState}
    >
      <Paper shadow="sm" radius="sm" h="100%">
        <Box
          ref={toolbarRef}
          style={{
            borderTopLeftRadius: 'var(--mantine-radius-sm)',
            borderTopRightRadius: 'var(--mantine-radius-sm)',
            borderBottom: '1px solid var(--mantine-color-default-border)',
          }}
        >
          <Group justify="space-between" align="center" m="xs" gap="xs" role="toolbar">
            <Flex justify="space-between" align="center">
              {!hidingControls && (
                <>
                  <Flex align="center" p="xs">
                    {players[playerId as number] ? (
                      <Box py="sm">
                        <UserInfo
                          user={players[playerId as number]}
                          placement={
                            Placements.bottomEnd as React.ComponentProps<
                              typeof UserInfo
                            >['placement']
                          }
                          hideOnlineIndicator
                        />
                      </Box>
                    ) : (
                      <Title order={5} pt="sm" pl="sm">
                        {i18n.t('Spectator')}
                      </Title>
                    )}
                  </Flex>
                  <Group
                    align="center"
                    ml="sm"
                    mr="auto"
                    gap={0}
                    role="group"
                    aria-label={i18n.t('Editor mode')}
                  >
                    {/* playerId is a legacy prop DarkModeButton no longer reads; kept for runtime parity. */}
                    <DakModeButton
                      {...({ playerId: currentUserId } as React.ComponentProps<
                        typeof DakModeButton
                      >)}
                    />
                  </Group>
                  <Group
                    align="center"
                    ml="sm"
                    mr="auto"
                    gap="xs"
                    role="group"
                    aria-label={i18n.t('Editor size controls')}
                  >
                    <Button.Group>
                      <Button variant="default" size="compact-sm" onClick={handleDecreaseFontSize}>
                        -
                      </Button>
                      <Button variant="default" size="compact-sm" onClick={handleIncreaseFontSize}>
                        +
                      </Button>
                    </Button.Group>
                    <Text span size="sm">
                      {fontSize}
                    </Text>
                  </Group>

                  <Flex align="center">
                    <NativeSelect
                      key="select_panel_mode"
                      radius="md"
                      value={monacoTheme}
                      onChange={handleChangeMonacoTheme}
                      data={['custom', ...Object.values(themeList)]}
                    />
                  </Flex>
                </>
              )}
            </Flex>
            <Flex align="center" justify="center">
              {/* <ActionIcon */}
              {/*   title="Swap game widgets" */}
              {/*   variant={switchedWidgetsStatus ? 'filled' : 'default'} */}
              {/*   onClick={handleSwitchWidgets} */}
              {/* > */}
              {/*   <FontAwesomeIcon icon="exchange-alt" /> */}
              {/* </ActionIcon> */}
              <ActionIcon
                title={i18n.t('Swap game widgets')}
                variant={!hidingControls ? 'filled' : 'default'}
                radius="md"
                mr={4}
                onClick={handleSwitchHidingControls}
              >
                <FontAwesomeIcon icon="eye" />
              </ActionIcon>
              <LanguagePickerView
                {...({ currentLangSlug: params.syntax, isDisabled: true } as React.ComponentProps<
                  typeof LanguagePickerView
                >)}
              />
            </Flex>
          </Group>
        </Box>
        <ExtendedEditor {...editorParams} />
        <EditorResultIcon mode="spectator">
          <GameResultIcon mode="spectator" userId={params.userId as number} />
        </EditorResultIcon>
      </Paper>
    </Box>
  );
}

export default memo(SpectatorEditor);
