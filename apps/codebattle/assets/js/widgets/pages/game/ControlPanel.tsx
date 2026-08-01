import React, { type ReactNode, useEffect, useState } from 'react';

import copy from 'copy-to-clipboard';
import { PlayerIcon } from 'react-player-controls';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Clock,
  Copy,
  FastForward,
  Minus,
  Plus,
  Settings,
} from 'react-feather';
import { useDispatch } from 'react-redux';

import i18n from '../../../i18n';
import playbackModes from '../../config/playbackModes';
import { replayerMachineStates } from '../../machines/game';
import { actions } from '../../slices';

const speedOptions = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4];
const formatSpeedLabel = (value: number) => `${value}×`;
type SettingsView = 'main' | 'speed';

const formatDuration = (ms: number | null | undefined) => {
  if (ms === null || ms === undefined || Number.isNaN(ms)) return '--:--';
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
};

export { formatDuration };

interface ControlPanelProps {
  // xstate v4 machine state — no usable exported type (see conventions rule 7)
  roomMachineState: any;
  onPauseClick: () => void;
  onPlayClick: () => void;
  onChangeSpeed: (speedMode: string) => void;
  playbackMode?: string;
  onChangePlaybackMode?: (playbackMode: string) => void;
  children?: ReactNode;
  nextRecordId?: number | string;
  currentTime?: number | null;
  totalDuration?: number | null;
}

function ControlPanel({
  roomMachineState,
  onPauseClick,
  onPlayClick,
  onChangeSpeed,
  playbackMode,
  onChangePlaybackMode,
  children,
  nextRecordId,
  currentTime,
  totalDuration,
}: ControlPanelProps) {
  const dispatch = useDispatch();
  const [linkCopied, setLinkCopied] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsView, setSettingsView] = useState<SettingsView>('main');

  const { speedMode } = roomMachineState.context;
  const isPaused = !roomMachineState.matches({ replayer: replayerMachineStates.playing });
  const speedValue = Math.min(4, Math.max(0.5, Number.parseFloat(speedMode) || 1));

  useEffect(() => {
    if (!linkCopied) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setLinkCopied(false), 1800);
    return () => window.clearTimeout(timeoutId);
  }, [linkCopied]);

  const onControlButtonClick = () => {
    switch (true) {
      case roomMachineState.matches({ replayer: replayerMachineStates.ended }):
      case roomMachineState.matches({ replayer: replayerMachineStates.paused }):
        onPlayClick();
        break;
      case roomMachineState.matches({ replayer: replayerMachineStates.playing }):
        onPauseClick();
        break;
      default:
        dispatch(actions.setError(new Error('unexpected game state [players ControlPanel]')));
    }
  };

  const setSpeed = (value: number) => {
    onChangeSpeed(`${value}x`);
  };

  const changeSpeedBy = (delta: number) => {
    setSpeed(Math.min(4, Math.max(0.5, speedValue + delta)));
  };

  const setPlaybackMode = (mode: string) => {
    if (mode !== playbackMode) {
      onChangePlaybackMode?.(mode);
    }
  };

  const copyCurrentPositionLink = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set('t', String(nextRecordId ?? 0));
    setLinkCopied(await copy(url.toString()));
  };

  const toggleSettings = () => {
    if (settingsOpen) {
      setSettingsView('main');
    }

    setSettingsOpen(!settingsOpen);
  };

  return (
    <div className="cb-replayer-controls">
      {settingsOpen && (
        <div className="cb-replayer-settings" role="dialog" aria-label={i18n.t('Replay settings')}>
          {settingsView === 'main' ? (
            <>
              <div className="cb-replayer-settings__header">{i18n.t('Replay settings')}</div>

              <button
                type="button"
                className="cb-replayer-settings__menu-item"
                onClick={() => setSettingsView('speed')}
              >
                <FastForward size={18} aria-hidden="true" />
                <span>
                  <strong>{i18n.t('Playback speed')}</strong>
                  <small>{i18n.t('Choose from 0.5× to 4×')}</small>
                </span>
                <span className="cb-replayer-settings__menu-value">
                  {formatSpeedLabel(speedValue)}
                  <ChevronRight size={18} aria-hidden="true" />
                </span>
              </button>

              {playbackMode && (
                <div className="cb-replayer-settings__timing">
                  <div className="cb-replayer-settings__timing-title">
                    <Clock size={18} aria-hidden="true" />
                    <span>
                      <strong>{i18n.t('Timing')}</strong>
                      <small>{i18n.t('Original pauses or uniform steps')}</small>
                    </span>
                  </div>
                  <div
                    className="cb-replayer-settings__segmented"
                    role="group"
                    aria-label={i18n.t('Replay timing')}
                  >
                    <button
                      type="button"
                      className={playbackMode === playbackModes.realtime ? 'active' : ''}
                      aria-pressed={playbackMode === playbackModes.realtime}
                      onClick={() => setPlaybackMode(playbackModes.realtime)}
                    >
                      {i18n.t('Real time')}
                    </button>
                    <button
                      type="button"
                      className={playbackMode === playbackModes.standard ? 'active' : ''}
                      aria-pressed={playbackMode === playbackModes.standard}
                      onClick={() => setPlaybackMode(playbackModes.standard)}
                    >
                      {i18n.t('Uniform')}
                    </button>
                  </div>
                </div>
              )}

              <button
                className="cb-replayer-settings__menu-item"
                type="button"
                aria-label={i18n.t('Copy replay link at current position')}
                onClick={copyCurrentPositionLink}
              >
                {linkCopied ? (
                  <Check size={18} aria-hidden="true" />
                ) : (
                  <Copy size={18} aria-hidden="true" />
                )}
                <span>
                  <strong>{i18n.t(linkCopied ? 'Link copied' : 'Copy replay link')}</strong>
                  <small>{i18n.t('Share this exact replay position')}</small>
                </span>
              </button>
            </>
          ) : (
            <>
              <div className="cb-replayer-settings__header cb-replayer-settings__header--back">
                <button
                  type="button"
                  aria-label={i18n.t('Back to replay settings')}
                  onClick={() => setSettingsView('main')}
                >
                  <ArrowLeft size={20} aria-hidden="true" />
                </button>
                <span>{i18n.t('Playback speed')}</span>
              </div>

              <output className="cb-replayer-settings__speed-value" htmlFor="replayer-speed">
                {formatSpeedLabel(speedValue)}
              </output>

              <div className="cb-replayer-settings__speed-slider-row">
                <button
                  type="button"
                  aria-label={i18n.t('Decrease playback speed')}
                  disabled={speedValue === 0.5}
                  onClick={() => changeSpeedBy(-0.5)}
                >
                  <Minus size={20} aria-hidden="true" />
                </button>
                <input
                  id="replayer-speed"
                  className="cb-replayer-settings__speed-slider"
                  type="range"
                  min="0.5"
                  max="4"
                  step="0.5"
                  value={speedValue}
                  style={
                    {
                      '--speed-progress': `${((speedValue - 0.5) / 3.5) * 100}%`,
                    } as React.CSSProperties
                  }
                  aria-label={i18n.t('Playback speed')}
                  aria-valuetext={formatSpeedLabel(speedValue)}
                  onChange={(event) => setSpeed(Number(event.target.value))}
                />
                <button
                  type="button"
                  aria-label={i18n.t('Increase playback speed')}
                  disabled={speedValue === 4}
                  onClick={() => changeSpeedBy(0.5)}
                >
                  <Plus size={20} aria-hidden="true" />
                </button>
              </div>

              <div
                className="cb-replayer-settings__speed-presets"
                role="group"
                aria-label={i18n.t('Playback speed presets')}
              >
                {speedOptions.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={value === speedValue ? 'active' : ''}
                    aria-label={i18n.t('Set playback speed to %{speed}', {
                      speed: formatSpeedLabel(value),
                    })}
                    aria-pressed={value === speedValue}
                    onClick={() => setSpeed(value)}
                  >
                    {formatSpeedLabel(value)}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div className="cb-replayer-controls__main">
        <button
          type="button"
          className="cb-replayer-controls__play"
          onClick={onControlButtonClick}
          aria-label={i18n.t(isPaused ? 'Play replay' : 'Pause replay')}
          title={i18n.t(isPaused ? 'Play replay' : 'Pause replay')}
        >
          {isPaused ? (
            <PlayerIcon.Play width={24} height={24} />
          ) : (
            <PlayerIcon.Pause width={24} height={24} />
          )}
        </button>

        <div className="cb-replayer-controls__timeline">
          {children}
          {totalDuration !== null && totalDuration !== undefined && (
            <span
              className="cb-replayer-controls__time text-monospace"
              aria-label={i18n.t('Playback time')}
            >
              {formatDuration(currentTime)}
              <span aria-hidden="true"> / </span>
              {formatDuration(totalDuration)}
            </span>
          )}
        </div>

        <button
          className={`cb-replayer-controls__settings-button ${settingsOpen ? 'active' : ''}`}
          type="button"
          aria-label={i18n.t('Replay settings')}
          aria-expanded={settingsOpen}
          title={i18n.t('Replay settings')}
          onClick={toggleSettings}
        >
          <Settings size={20} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export default ControlPanel;
