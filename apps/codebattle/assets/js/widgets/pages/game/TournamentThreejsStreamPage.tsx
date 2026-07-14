import React, { memo, useEffect, useMemo, useState } from 'react';

import { getPageProp } from '@/inertia/pageProps';

import socket from '../../../socket';

import ThreejsGamePage from './ThreejsGamePage';

const ALLOWED_WIDGETS = new Set([
  'task',
  'examples',
  'timer',
  'leftEditor',
  'rightEditor',
  'leftTests',
  'rightTests',
]);

const ALLOWED_THEMES = new Set(['vs', 'vs-dark', 'hc-black', 'hc-light', 'cb-stream']);

const TRUTHY = new Set(['1', 'true', 'yes', 'on']);

function parseStreamParams(search: string) {
  const p = new URLSearchParams(search || '');
  const widgetRaw = (p.get('widget') || '').trim();
  const themeRaw = (p.get('editor_theme') || p.get('theme') || '').trim();
  const fontRaw = parseInt(p.get('font_size') || p.get('fontSize') || '', 10);
  const cupXRaw = parseInt(p.get('cup_x') || p.get('cupX') || '', 10);
  const cupYRaw = parseInt(p.get('cup_y') || p.get('cupY') || '', 10);

  return {
    fullscreen: TRUTHY.has((p.get('fullscreen') || '').toLowerCase()),
    widget: widgetRaw || null,
    widgetValid: widgetRaw ? ALLOWED_WIDGETS.has(widgetRaw) : true,
    fontSize: Number.isFinite(fontRaw) && fontRaw >= 8 && fontRaw <= 200 ? fontRaw : null,
    editorTheme: ALLOWED_THEMES.has(themeRaw) ? themeRaw : null,
    hideCup: TRUTHY.has((p.get('hide_cup') || '').toLowerCase()),
    cupX: Number.isFinite(cupXRaw) ? cupXRaw : null,
    cupY: Number.isFinite(cupYRaw) ? cupYRaw : null,
  };
}

function TournamentThreejsStreamPage() {
  const tournamentId = getPageProp('tournament_id');
  const initialGameId = getPageProp('game_id', null);
  const initialGame = getPageProp('game', null);

  const streamParams = useMemo(
    () => parseStreamParams(typeof window !== 'undefined' ? window.location.search : ''),
    [],
  );

  const [activeGameId, setActiveGameId] = useState<number | string | null>(initialGameId || null);

  useEffect(() => {
    if (!tournamentId) return () => {};

    const channel = socket.channel(`stream:${tournamentId}`, {});

    const handleActiveGame = (payload: { id?: number | string }) => {
      const id = payload?.id;
      if (id) {
        setActiveGameId((prev) => (prev === id ? prev : id));
      }
    };

    const ref = channel.on('stream:active_game_selected', handleActiveGame);

    channel
      .join()
      .receive('ok', (resp: { active_game_id?: number | string }) => {
        const activeId = resp?.active_game_id;
        if (activeId) {
          setActiveGameId((prev) => (prev === activeId ? prev : activeId));
        }
      })
      .receive('error', (err: unknown) => {
        // eslint-disable-next-line no-console
        console.error('Failed to join tournament stream channel', err);
      });

    return () => {
      channel.off('stream:active_game_selected', ref);
      channel.leave();
    };
  }, [tournamentId]);

  if (!activeGameId) {
    return (
      <div
        style={{
          width: '100%',
          height: '100vh',
          background: '#000',
          color: '#e0bf7a',
          fontFamily: 'Menlo, Monaco, Consolas, monospace',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '26px',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        Waiting for the next match...
      </div>
    );
  }

  const initialGameForPane = activeGameId === initialGameId ? initialGame || {} : {};

  return (
    <ThreejsGamePage
      key={activeGameId}
      gameId={activeGameId}
      initialGame={initialGameForPane}
      streamParams={streamParams}
    />
  );
}

export default memo(TournamentThreejsStreamPage);
