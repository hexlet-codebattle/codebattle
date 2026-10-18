import type { OnMount } from '@monaco-editor/react';
import { ActionIcon, Badge, Button, Checkbox, Menu, Text, Tooltip } from '@mantine/core';
import { useFullscreenDocument } from '@mantine/hooks';
import { IconArrowBackUp, IconCheck, IconLayoutGrid, IconMaximize, IconMinimize, IconPencil, IconRestore } from '@tabler/icons-react';
import { type ReactNode, type RefObject, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import logo from '@/assets/logo.svg?raw';
import { EditorPane } from '@/features/game/components/EditorPane';
import { TournamentBox } from '@/features/game/components/TournamentBox';
import { CodeEditor } from '@/features/game/editor/LazyCodeEditor';
import { useGameStore } from '@/features/game/store';
import type { Game, GamePlayer } from '@/features/game/types';
import { useGame } from '@/features/game/useGame';
import { ColorSchemeToggle } from '@/layout/ColorSchemeToggle';

import { StreamExamples, StreamTask, StreamTests, StreamTimer, StreamWaiting } from './bodies';
import { DEFAULT_FONT_SIZE, DEFAULT_LAYOUT, FONT_LIMITS, loadLayout, type Rect, saveLayout, type StreamLayout, type StreamParams, WIDGETS, type WidgetId } from './layout';
import { type Glow, Window } from './Pane';
import { clamp, typingIntensity, useBattleSignals } from './signals';
import classes from './Stream.module.css';

type CodeEditorInstance = Parameters<OnMount>[0];

interface StreamArenaProps {
  gameId: number;
  /** The game from the page props, so the screen renders before the channel joins. */
  initialGame: Game | null;
  params: StreamParams;
  /** Where the toolbar's back button goes (the tournament or the game). */
  backHref: string;
}

/** The winner's lightning cup over their editor (placement from `cup_x` / `cup_y`). */
function Cup({ params }: { params: StreamParams }) {
  const { t } = useTranslation();
  if (params.hideCup) return null;
  return (
    <img
      src="/assets/images/stream/lightning.png"
      alt={t('Winner')}
      className={classes.cup}
      style={{ ...(params.cupY != null ? { top: params.cupY } : { bottom: 20 }), left: params.cupX ?? 24 }}
    />
  );
}

/** The players' scroll (sent by the game page), mirrored in their editors; carets come with EditorPane. */
function useScrollEvents(editors: RefObject<Record<number, CodeEditorInstance>>) {
  return useMemo(
    () => ({
      'editor:scroll_position': ({ user_id: userId, scroll_top: top, scroll_left: left }: { user_id?: number; scroll_top?: number; scroll_left?: number }) => {
        const editor = userId != null ? editors.current[userId] : undefined;
        if (typeof top === 'number') editor?.setScrollTop(top);
        if (typeof left === 'number') editor?.setScrollLeft(left);
      },
    }),
    [editors],
  );
}

/** The toolbar shows on mouse movement and fades after a few idle seconds (never while editing). */
function useIdle(timeoutMs: number) {
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    let timer = window.setTimeout(() => setIdle(true), timeoutMs);
    const wake = () => {
      setIdle(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setIdle(true), timeoutMs);
    };
    window.addEventListener('pointermove', wake);
    window.addEventListener('keydown', wake);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pointermove', wake);
      window.removeEventListener('keydown', wake);
    };
  }, [timeoutMs]);
  return idle;
}

/**
 * The broadcast screen of a game, full-window: task, examples, timer, both editors, their
 * tests and (tournament games) the round and standings, as windows the operator places
 * freely (edit mode). Built from the game page's components; light/dark. With `?widget=…`
 * a single widget fills the window, for an OBS browser source.
 */
export function StreamArena({ gameId, initialGame, params, backHref }: StreamArenaProps) {
  const { t } = useTranslation();

  // Same store and channel hook as the game page, watching quietly.
  useState(() => {
    if (initialGame?.players?.length) useGameStore.getState().load(initialGame);
  });
  const editors = useRef<Record<number, CodeEditorInstance>>({});
  const scrollEvents = useScrollEvents(editors);
  useGame(gameId, { embedded: true, extraEvents: scrollEvents });

  const game = useGameStore((state) => state.game);
  const tournament = useGameStore((state) => state.tournament);
  const checking = useGameStore((state) => state.checking);
  const signals = useBattleSignals();
  const registerEditor =
    (player: GamePlayer): OnMount =>
    (editor) => {
      editors.current[player.id] = editor;
    };

  // Frames glow with typing, checks and results.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 150);
    return () => window.clearInterval(id);
  }, []);
  const glowFor = (player: GamePlayer): Glow | null => {
    const s = signals.current;
    if (player.result === 'won') return { color: 'var(--cb-success)', strength: 0.4 + clamp(1 - (now - s.winAt) / 1900, 0, 1) * 0.6 };
    if (player.result === 'lost' || player.result === 'gave_up')
      return { color: 'var(--cb-danger)', strength: 0.3 + clamp(1 - (now - s.lossAt) / 1450, 0, 1) * 0.6 };
    if (checking[player.id]) return { color: 'var(--mantine-color-blue-5)', strength: 0.3 + ((Math.sin(now / 120) + 1) / 2) * 0.7 };
    const typing = typingIntensity(s, player.id, now);
    return typing > 0.02 ? { color: 'var(--mantine-color-violet-5)', strength: 0.2 + typing * 0.7 } : null;
  };

  // ----- layout -----
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [layout, setLayout] = useState<StreamLayout>(loadLayout);
  const [editMode, setEditMode] = useState(false);
  const { toggle: toggleFullscreen, fullscreen } = useFullscreenDocument();
  const idle = useIdle(2500);
  // In fullscreen the toolbar stays out of the picture; the top-right corner calls it back.
  const [summoned, setSummoned] = useState(false);
  const toolbarHidden = !editMode && (fullscreen ? !summoned : idle);
  useEffect(() => saveLayout(layout), [layout]);

  const update = (patch: (current: StreamLayout) => Partial<StreamLayout>) => setLayout((current) => ({ ...current, ...patch(current) }));
  const setRect = (id: WidgetId, rect: Rect) => update((current) => ({ rects: { ...current.rects, [id]: rect } }));
  const setVisible = (id: WidgetId, visible: boolean) => update((current) => ({ visible: { ...current.visible, [id]: visible } }));
  const toFront = (id: WidgetId) =>
    update((current) => (current.order.at(-1) === id ? {} : { order: [...current.order.filter((item) => item !== id), id] }));
  const setFont = (id: WidgetId, delta: number) =>
    update((current) => ({
      fontSizes: { ...current.fontSizes, [id]: clamp((current.fontSizes[id] ?? DEFAULT_FONT_SIZE) + delta, FONT_LIMITS.min, FONT_LIMITS.max) },
    }));

  // ----- kiosk: one widget alone, for an OBS browser source -----
  const widget = params.widget;
  const theme = params.editorTheme ?? undefined;
  const transparentKiosk = Boolean(widget && (widget === 'task' || widget.endsWith('Tests') || (widget.endsWith('Editor') && theme === 'cb-stream')));
  useEffect(() => {
    document.documentElement.classList.toggle('cb-stream-transparent', transparentKiosk);
    return () => document.documentElement.classList.remove('cb-stream-transparent');
  }, [transparentKiosk]);

  const [left, right] = [game?.players[0], game?.players[1]];
  const labels: Record<WidgetId, string> = {
    task: t('Task'),
    examples: t('Examples'),
    timer: t('Timer'),
    leftEditor: left?.name ?? t('Left editor'),
    rightEditor: right?.name ?? t('Right editor'),
    leftTests: `${left?.name ?? t('Left')} — ${t('Tests')}`,
    rightTests: `${right?.name ?? t('Right')} — ${t('Tests')}`,
    tournament: t('Tournament'),
  };

  const body = (id: WidgetId, kiosk: boolean): ReactNode => {
    const fontSize = kiosk ? (params.fontSize ?? DEFAULT_FONT_SIZE) : layout.fontSizes[id];
    const seat = id.startsWith('left') ? left : right;
    switch (id) {
      case 'task':
        return game?.task ? <StreamTask fontSize={fontSize} /> : null;
      case 'examples':
        return game?.task?.examples?.trim() ? <StreamExamples fontSize={fontSize} /> : null;
      case 'timer':
        return game ? <StreamTimer kiosk={kiosk} /> : null;
      case 'tournament':
        return tournament ? (
          <div className={classes.scroll}>
            <TournamentBox info={tournament} />
          </div>
        ) : null;
      case 'leftEditor':
      case 'rightEditor':
        if (!seat) return null;
        return kiosk ? (
          <div className={classes.editorBody}>
            <KioskEditor player={seat} fontSize={fontSize} theme={theme} onMount={registerEditor(seat)} />
            {seat.result === 'won' && <Cup params={params} />}
          </div>
        ) : (
          <div className={classes.editorBody}>
            <EditorPane player={seat} editable={false} api={null} allowClipboard embedded fontSize={fontSize} theme={theme} onEditorMount={registerEditor(seat)} />
            {seat.result === 'won' && <Cup params={params} />}
          </div>
        );
      case 'leftTests':
      case 'rightTests':
        return seat ? <StreamTests playerId={seat.id} kiosk={kiosk} fontSize={kiosk ? params.fontSize : null} /> : null;
      default:
        return null;
    }
  };

  if (!params.widgetValid) return <StreamWaiting label={t('Waiting...')} />;

  if (widget) {
    const content = body(widget, true);
    if (!content) return <StreamWaiting label={t('Waiting...')} />;
    return (
      <div className={classes.kiosk} data-transparent={transparentKiosk || undefined}>
        {content}
      </div>
    );
  }

  const fontWidgets: WidgetId[] = ['task', 'examples', 'leftEditor', 'rightEditor'];
  const glowWidgets: Partial<Record<WidgetId, GamePlayer | undefined>> = { leftEditor: left, rightEditor: right };

  return (
    <div className={classes.screen} data-edit={editMode || undefined}>
      <div ref={stageRef} className={classes.stage}>
        {layout.order.map((id, index) => {
          if (!layout.visible[id]) return null;
          const content = body(id, false);
          if (!content) return null;
          const player = glowWidgets[id];
          return (
            <Window
              key={`${id}-${id.endsWith('Editor') ? (glowWidgets[id]?.id ?? 'none') : ''}`}
              title={labels[id]}
              rect={layout.rects[id]}
              zIndex={index + 1}
              stageRef={stageRef}
              editMode={editMode}
              glow={player ? glowFor(player) : null}
              fontSize={fontWidgets.includes(id) ? layout.fontSizes[id] : undefined}
              onFont={fontWidgets.includes(id) ? (delta) => setFont(id, id.endsWith('Editor') ? delta * 2 : delta) : undefined}
              onChange={(rect) => setRect(id, rect)}
              onHide={() => setVisible(id, false)}
              onFocus={() => toFront(id)}
            >
              {content}
            </Window>
          );
        })}
      </div>

      {fullscreen && !editMode && <div className={classes.toolbarZone} onPointerEnter={() => setSummoned(true)} />}
      <div className={classes.toolbar} data-hidden={toolbarHidden || undefined} onPointerLeave={() => setSummoned(false)}>
        <a href={backHref} className={classes.logo} aria-label="Codebattle" dangerouslySetInnerHTML={{ __html: logo }} />
        {game && (
          <Badge variant="light" color={game.state === 'playing' ? 'green' : 'gray'} tt="uppercase">
            {game.state}
          </Badge>
        )}
        <Tooltip label={t('Back')}>
          <ActionIcon component="a" href={backHref} variant="default" aria-label={t('Back')}>
            <IconArrowBackUp size={16} />
          </ActionIcon>
        </Tooltip>
        <Button
          size="compact-sm"
          variant={editMode ? 'filled' : 'default'}
          color={editMode ? 'green' : undefined}
          leftSection={editMode ? <IconCheck size={14} /> : <IconPencil size={14} />}
          onClick={() => setEditMode((value) => !value)}
        >
          {editMode ? t('Done') : t('Edit Layout')}
        </Button>
        <Menu position="bottom-end" closeOnItemClick={false} width={240}>
          <Menu.Target>
            <Button size="compact-sm" variant="default" leftSection={<IconLayoutGrid size={14} />}>
              {t('Widgets')}
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            {WIDGETS.filter((id) => id !== 'tournament' || tournament).map((id) => (
              <Menu.Item key={id} onClick={() => setVisible(id, !layout.visible[id])}>
                <Checkbox size="xs" color="green" readOnly checked={layout.visible[id]} label={labels[id]} styles={{ label: { cursor: 'pointer' } }} />
              </Menu.Item>
            ))}
            <Menu.Divider />
            <Menu.Item color="red" leftSection={<IconRestore size={14} />} onClick={() => setLayout(DEFAULT_LAYOUT)}>
              {t('Reset layout')}
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
        <Tooltip label={fullscreen ? t('Exit full screen') : t('Full screen')}>
          <ActionIcon variant="default" onClick={() => void toggleFullscreen()} aria-label={t('Full screen')}>
            {fullscreen ? <IconMinimize size={16} /> : <IconMaximize size={16} />}
          </ActionIcon>
        </Tooltip>
        <ColorSchemeToggle />
      </div>

      {editMode && (
        <Text className={classes.editHint} size="xs">
          {t('Drag windows to move, the corner to resize. Hidden ones come back from Widgets.')}
        </Text>
      )}
    </div>
  );
}

/** A single editor for an OBS source: no header, the stream theme when asked for. */
function KioskEditor({ player, fontSize, theme, onMount }: { player: GamePlayer; fontSize: number; theme?: string; onMount: OnMount }) {
  const editor = useGameStore((state) => state.editors[player.id]);
  return <CodeEditor value={editor?.text ?? ''} lang={editor?.lang ?? player.editor_lang} readOnly allowClipboard fontSize={fontSize} theme={theme} onEditorMount={onMount} />;
}
