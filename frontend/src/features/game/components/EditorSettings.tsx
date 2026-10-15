import { ActionIcon, Anchor, Group, Popover, SegmentedControl, SimpleGrid, Slider, Stack, Switch, Text, Tooltip, UnstyledButton, useComputedColorScheme } from '@mantine/core';
import { IconSettings } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

import { FONT_SIZES, type LineNumbers, type Prefs, useEditorPrefs } from '../editor/prefs';
import { EDITOR_THEMES, themeSwatch } from '../editor/themes';
import classes from '../GameRoom.module.css';

type Toggle = keyof Pick<Prefs, 'wordWrap' | 'minimap' | 'whitespace' | 'bracketColors' | 'stickyScroll' | 'smoothCursor'>;

/** Every theme as a tiny preview (background + three coloured "code lines"); the name on hover. */
function ThemeSwatches({ value, onChange }: { value: string; onChange: (theme: string) => void }) {
  const { t } = useTranslation();
  const scheme = useComputedColorScheme('dark');

  return (
    <SimpleGrid cols={6} spacing={6} verticalSpacing={6}>
      {EDITOR_THEMES.map((theme) => {
        const swatch = themeSwatch(theme.value, scheme);
        return (
          <Tooltip key={theme.value} label={t(theme.label)} openDelay={150} withinPortal={false}>
            <UnstyledButton
              className={classes.swatch}
              style={{ background: swatch.bg }}
              data-active={theme.value === value || undefined}
              onClick={() => onChange(theme.value)}
              aria-label={t(theme.label)}
              aria-pressed={theme.value === value}
            >
              {swatch.lines.map((color, index) => (
                // eslint-disable-next-line react/no-array-index-key
                <span key={index} style={{ background: color, width: `${[70, 45, 58][index]}%` }} />
              ))}
            </UnstyledButton>
          </Tooltip>
        );
      })}
    </SimpleGrid>
  );
}

/** ⚙ next to the editor actions: how both editors look and behave (kept in this browser). Compact: fits beside the editor. */
export function EditorSettings() {
  const { t } = useTranslation();
  const prefs = useEditorPrefs();
  const themeLabel = EDITOR_THEMES.find((theme) => theme.value === prefs.theme)?.label ?? 'Codebattle';

  const toggles: { key: Toggle; label: string; hint: string }[] = [
    { key: 'wordWrap', label: t('Word wrap'), hint: t('Long lines wrap instead of scrolling sideways') },
    { key: 'minimap', label: t('Minimap'), hint: t('A small map of the code on the right') },
    { key: 'whitespace', label: t('Whitespace'), hint: t('Dots for spaces, arrows for tabs') },
    { key: 'bracketColors', label: t('Colored brackets'), hint: t('Matching pairs share a color') },
    { key: 'stickyScroll', label: t('Sticky scroll'), hint: t('The current function stays at the top') },
    { key: 'smoothCursor', label: t('Smooth cursor'), hint: t('The cursor glides and fades instead of jumping') },
  ];

  return (
    <Popover position="bottom-end" width={330} shadow="md" withArrow>
      <Popover.Target>
        <Tooltip label={t('Editor settings')}>
          <ActionIcon variant="subtle" color="gray" size="md" aria-label={t('Editor settings')}>
            <IconSettings size={16} />
          </ActionIcon>
        </Tooltip>
      </Popover.Target>
      <Popover.Dropdown className={classes.settings}>
        <Stack gap={12}>
          <div>
            <Group justify="space-between" mb={6}>
              <Text size="xs" fw={500}>
                {t('Font size')}
              </Text>
              <Text size="xs" ff="monospace" c="dimmed">
                {prefs.fontSize}px
              </Text>
            </Group>
            <Slider
              min={FONT_SIZES.min}
              max={FONT_SIZES.max}
              value={prefs.fontSize}
              onChange={(fontSize) => prefs.update({ fontSize })}
              color="green"
              size="sm"
              label={null}
              aria-label={t('Font size')}
            />
          </div>

          <div>
            <Group justify="space-between" mb={6}>
              <Text size="xs" fw={500}>
                {t('Color theme')}
              </Text>
              <Text size="xs" c="dimmed">
                {t(themeLabel)}
              </Text>
            </Group>
            <ThemeSwatches value={prefs.theme} onChange={(theme) => prefs.update({ theme })} />
          </div>

          <Group gap="xs" wrap="nowrap" justify="space-between">
            <Text size="xs" fw={500}>
              {t('Line numbers')}
            </Text>
            <SegmentedControl
              size="xs"
              value={prefs.lineNumbers}
              onChange={(value) => prefs.update({ lineNumbers: value as LineNumbers })}
              data={[
                { value: 'on', label: t('On') },
                { value: 'relative', label: t('Relative') },
                { value: 'off', label: t('Off') },
              ]}
            />
          </Group>

          <SimpleGrid cols={2} spacing="xs" verticalSpacing={8}>
            {toggles.map(({ key, label, hint }) => (
              <Tooltip key={key} label={hint} openDelay={400} multiline w={220} withinPortal={false}>
                <div>
                  <Switch
                    size="xs"
                    color="green"
                    checked={prefs[key]}
                    onChange={(event) => prefs.update({ [key]: event.currentTarget.checked })}
                    label={label}
                  />
                </div>
              </Tooltip>
            ))}
          </SimpleGrid>

          <Group justify="flex-end">
            <Anchor component="button" type="button" size="xs" c="dimmed" onClick={prefs.reset}>
              {t('Reset to defaults')}
            </Anchor>
          </Group>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
