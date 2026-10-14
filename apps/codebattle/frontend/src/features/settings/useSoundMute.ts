import { notifications } from '@mantine/notifications';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useSoundStore } from '@/shared/sound';
import { useSharedProps } from '@/shared/useSharedProps';

import { updateSettings } from './api';

/**
 * The global sound switch (header and settings page). Applies at once, then
 * saves to the account; guests keep it in this browser only.
 */
export function useSoundMute() {
  const { t } = useTranslation();
  const { current_user: user } = useSharedProps();
  const muted = useSoundStore((state) => state.muted);
  const setMuted = useSoundStore((state) => state.setMuted);

  const toggle = async (next: boolean) => {
    setMuted(next);
    if (user.is_guest) return;
    try {
      await updateSettings({ sound_settings: { muted: next } });
    } catch {
      setMuted(!next);
      notifications.show({ color: 'red', message: t("Couldn't save your settings. Try again.") });
    }
  };

  return { muted, toggle };
}

/** Seeds the switch from the account on every page load (call once, in the layout). */
export function useSyncSoundMute() {
  const { current_user: user } = useSharedProps();
  const sound = user.sound_settings;
  const serverMuted = user.is_guest ? undefined : sound?.muted;

  useEffect(() => {
    if (serverMuted !== undefined) useSoundStore.getState().setMuted(serverMuted);
  }, [serverMuted]);

  // Levels for the sounds pages play (tournament cues, game events).
  useEffect(() => {
    if (sound) useSoundStore.getState().setSettings({ level: sound.level, tournament_level: sound.tournament_level });
  }, [sound?.level, sound?.tournament_level]); // eslint-disable-line react-hooks/exhaustive-deps
}
