import { ActionIcon, Select, Text, Tooltip } from '@mantine/core';
import { IconArrowBackUp, IconEye, IconEyeOff, IconMinus, IconPlus } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { EDITOR_THEMES } from '@/features/game/editor/themes';
import { ColorSchemeToggle } from '@/layout/ColorSchemeToggle';

import type { SpectatorPrefs } from './prefs';
import classes from './TournamentPlayer.module.css';

/** − size + for the code or the task text. */
export function FontControl({ font, label }: { font: SpectatorPrefs['editorFont']; label: string }) {
  const { t } = useTranslation();
  return (
    <Tooltip label={label}>
      <span className={classes.fontControl}>
        <ActionIcon variant="subtle" color="gray" size="sm" disabled={!font.canDecrease} onClick={() => font.change(-1)} aria-label={`${label}: ${t('Decrease')}`}>
          <IconMinus size={14} />
        </ActionIcon>
        <span className={classes.fontValue}>{font.value}</span>
        <ActionIcon variant="subtle" color="gray" size="sm" disabled={!font.canIncrease} onClick={() => font.change(1)} aria-label={`${label}: ${t('Increase')}`}>
          <IconPlus size={14} />
        </ActionIcon>
      </span>
    </Tooltip>
  );
}

interface ToolbarProps {
  tournamentId: number;
  playerName: string | null;
  prefs: SpectatorPrefs;
  /** The followed game's clock and state. */
  children?: ReactNode;
  /** The editor controls (font, theme) only when an editor is on screen. */
  withEditorControls?: boolean;
}

/**
 * The spectator screen's top bar: whose games these are, the game clock, and the look of the
 * screen (code size, editor theme, light/dark). The eye hides it all for a clean picture.
 */
export function Toolbar({ tournamentId, playerName, prefs, children = null, withEditorControls = true }: ToolbarProps) {
  const { t } = useTranslation();

  if (prefs.hideControls) {
    return (
      <Tooltip label={t('Show controls')} position="left">
        <ActionIcon className={classes.reveal} variant="default" size="lg" onClick={() => prefs.setHideControls(false)} aria-label={t('Show controls')}>
          <IconEye size={18} />
        </ActionIcon>
      </Tooltip>
    );
  }

  return (
    <header className={classes.toolbar}>
      <div className={classes.toolbarInfo}>
        <Tooltip label={t('Back')}>
          <ActionIcon component="a" href={`/tournaments/${tournamentId}`} variant="default" aria-label={t('Back')}>
            <IconArrowBackUp size={16} />
          </ActionIcon>
        </Tooltip>
        {playerName && (
          <Text fw={800} c="bright" truncate>
            {playerName}
          </Text>
        )}
        {children}
      </div>
      <div className={classes.toolbarControls}>
        {withEditorControls && (
          <>
            <FontControl font={prefs.editorFont} label={t('Font size')} />
            <Select
              size="xs"
              w={150}
              value={prefs.theme}
              onChange={(value) => value && prefs.setTheme(value)}
              data={EDITOR_THEMES.map((theme) => ({ value: theme.value, label: t(theme.label) }))}
              allowDeselect={false}
              comboboxProps={{ withinPortal: true }}
              aria-label={t('Color theme')}
            />
          </>
        )}
        <ColorSchemeToggle />
        <Tooltip label={t('Hide controls')}>
          <ActionIcon variant="default" onClick={() => prefs.setHideControls(true)} aria-label={t('Hide controls')}>
            <IconEyeOff size={16} />
          </ActionIcon>
        </Tooltip>
      </div>
    </header>
  );
}
