import { ActionIcon, Group, Text, Tooltip } from '@mantine/core';
import { IconArrowsMove, IconEyeOff, IconMinus, IconPlus } from '@tabler/icons-react';
import { type CSSProperties, type PointerEvent, type ReactNode, type RefObject, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { moveRect, type Rect } from './layout';
import classes from './Stream.module.css';

/** A frame highlight: a token colour and how strongly it glows (0..1). */
export interface Glow {
  color: string;
  strength: number;
}

interface WindowProps {
  title: string;
  rect: Rect;
  zIndex: number;
  stageRef: RefObject<HTMLDivElement | null>;
  editMode: boolean;
  glow?: Glow | null;
  fontSize?: number;
  onChange: (rect: Rect) => void;
  onFont?: (delta: number) => void;
  onHide: () => void;
  onFocus: () => void;
  children: ReactNode;
}

/**
 * A window of the broadcast screen, placed in screen fractions. In edit mode an overlay
 * takes the pointer (so the editor underneath doesn't): drag it to move, the corner to
 * resize; −/+ font, hide.
 */
export function Window({ title, rect, zIndex, stageRef, editMode, glow, fontSize, onChange, onFont, onHide, onFocus, children }: WindowProps) {
  const { t } = useTranslation();
  const drag = useRef<{ mode: 'drag' | 'resize'; x: number; y: number; start: Rect } | null>(null);

  const begin = (mode: 'drag' | 'resize') => (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    onFocus();
    drag.current = { mode, x: event.clientX, y: event.clientY, start: rect };
  };

  const move = (event: PointerEvent<HTMLElement>) => {
    const current = drag.current;
    const stage = stageRef.current;
    if (!current || !stage) return;
    onChange(moveRect(current.start, (event.clientX - current.x) / stage.clientWidth, (event.clientY - current.y) / stage.clientHeight, current.mode));
  };

  const end = () => {
    drag.current = null;
  };

  const style = {
    left: `${rect.x * 100}%`,
    top: `${rect.y * 100}%`,
    width: `${rect.w * 100}%`,
    height: `${rect.h * 100}%`,
    zIndex,
    ...(glow ? { '--glow': glow.color, '--glow-strength': `${Math.round(glow.strength * 100)}%` } : {}),
  } as CSSProperties;

  return (
    <section className={classes.window} style={style} data-glow={glow ? true : undefined} data-edit={editMode || undefined}>
      <div className={classes.windowBody}>{children}</div>

      {editMode && (
        <div className={classes.editOverlay} onPointerDown={begin('drag')} onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
          <Group gap={6} wrap="nowrap" className={classes.editBar} onPointerDown={(event) => event.stopPropagation()}>
            <IconArrowsMove size={14} />
            <Text span size="xs" fw={700} truncate>
              {title}
            </Text>
            {typeof fontSize === 'number' && onFont && (
              <Group gap={2} wrap="nowrap" ml="auto">
                <ActionIcon size="sm" variant="default" onClick={() => onFont(-1)} aria-label={t('Decrease font size')}>
                  <IconMinus size={12} />
                </ActionIcon>
                <Text span size="xs" ff="monospace" w={26} ta="center">
                  {fontSize}
                </Text>
                <ActionIcon size="sm" variant="default" onClick={() => onFont(1)} aria-label={t('Increase font size')}>
                  <IconPlus size={12} />
                </ActionIcon>
              </Group>
            )}
            <Tooltip label={t('Hide')}>
              <ActionIcon size="sm" variant="default" ml={onFont ? 4 : 'auto'} onClick={onHide} aria-label={t('Hide')}>
                <IconEyeOff size={12} />
              </ActionIcon>
            </Tooltip>
          </Group>
          <div className={classes.resize} onPointerDown={begin('resize')} onPointerMove={move} onPointerUp={end} onPointerCancel={end} />
        </div>
      )}
    </section>
  );
}
