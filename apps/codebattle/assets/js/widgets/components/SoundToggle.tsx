import React from 'react';

import { faVolumeMute, faVolumeUp } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import { useDispatch, useSelector } from 'react-redux';

import type { RootState } from '@/slices/store';

import i18n from '../../i18n';
import { toggleMuteSound } from '../slices/user';

interface SoundToggleProps {
  variant?: 'menu' | 'settings';
}

function SoundToggle({ variant = 'menu' }: SoundToggleProps) {
  const dispatch = useDispatch();
  const muted = Boolean(useSelector((state: RootState) => state.user.settings.mute));
  const isMenu = variant === 'menu';

  const toggleSound = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    dispatch(toggleMuteSound() as never);
  };

  return (
    <button
      type="button"
      className={cn({
        'cb-dropdown-item': isMenu,
        'cb-settings-sound-toggle': !isMenu,
      })}
      style={
        isMenu
          ? {
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              padding: '0.25rem 1.5rem',
            }
          : {
              display: 'flex',
              alignItems: 'center',
              borderRadius: '0.5rem',
              paddingLeft: '1rem',
              paddingRight: '1rem',
            }
      }
      aria-label={i18n.t(muted ? 'Turn sound on' : 'Mute sound')}
      aria-pressed={muted}
      onClick={toggleSound}
    >
      <span style={{ marginRight: '0.5rem' }}>
        <FontAwesomeIcon fixedWidth icon={muted ? faVolumeMute : faVolumeUp} />
      </span>
      <span>{i18n.t('Sound')}</span>
      <span
        style={{
          marginLeft: isMenu ? 'auto' : '0.5rem',
          color: isMenu ? 'var(--mantine-color-dimmed)' : undefined,
        }}
      >
        {i18n.t(muted ? 'Off' : 'On')}
      </span>
    </button>
  );
}

export default SoundToggle;
