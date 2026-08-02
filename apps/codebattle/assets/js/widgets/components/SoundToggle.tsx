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
      className={cn('d-flex align-items-center', {
        'dropdown-item cb-dropdown-item text-white': isMenu,
        'btn cb-settings-sound-toggle rounded-lg px-3': !isMenu,
      })}
      aria-label={i18n.t(muted ? 'Turn sound on' : 'Mute sound')}
      aria-pressed={muted}
      onClick={toggleSound}
    >
      <FontAwesomeIcon fixedWidth className="mr-2" icon={muted ? faVolumeMute : faVolumeUp} />
      <span>{i18n.t('Sound')}</span>
      <span className={cn({ 'ml-auto text-muted': isMenu, 'ml-2': !isMenu })}>
        {i18n.t(muted ? 'Off' : 'On')}
      </span>
    </button>
  );
}

export default SoundToggle;
