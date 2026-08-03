import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import isEmpty from 'lodash/isEmpty';

import sound from '../lib/sound';

import initial, { type UserSliceState } from './initial';

interface UserRecord {
  id: number;
  [key: string]: unknown;
}

const userSlice = createSlice({
  name: 'user',
  initialState: initial.user,
  reducers: {
    setCurrentUser: (state, { payload }: PayloadAction<{ user: UserRecord }>) => {
      const { user } = payload;
      const currentUserId = user.id;
      if (currentUserId || currentUserId === 0) {
        state.currentUserId = currentUserId;
        state.users[user.id] = user;
      }
    },
    updateUsers: (state, { payload }: PayloadAction<{ users: UserRecord[] }>) => {
      const { users: usersList } = payload;
      const users = usersList.reduce<Record<number, Record<string, unknown>>>(
        (acc, user) =>
          state.users[user.id]
            ? { ...acc, [user.id]: { ...state.users[user.id], ...user } }
            : { ...acc, [user.id]: user },
        {},
      );
      if (!isEmpty(users)) {
        Object.assign(state.users, users);
      }
    },
    updateUsersStats: (
      state,
      { payload }: PayloadAction<{ userId: number; stats: unknown; achievements: unknown }>,
    ) => {
      const { userId, stats, achievements } = payload;
      state.usersStats[userId] = { stats, achievements };
    },
    updateUserSettings: (state, { payload }: PayloadAction<Record<string, unknown>>) => {
      Object.assign(state.settings, payload);
    },
    setMuteSound: (state, { payload }: PayloadAction<boolean>) => {
      localStorage.setItem('ui_mute_sound', String(payload));
      state.settings.mute = payload;

      const soundSettings = state.settings.soundSettings as Record<string, unknown> | undefined;
      if (soundSettings) {
        soundSettings.muted = payload;
      }
    },
    togglePremiumRequestStatus: (state) => {
      localStorage.setItem(
        'already_send_premium_request',
        String(!state.settings.alreadySendPremiumRequest),
      );
      state.settings.alreadySendPremiumRequest = !state.settings.alreadySendPremiumRequest;
    },
  },
});

const { actions, reducer } = userSlice;

let muteSaveQueue: Promise<void> = Promise.resolve();

const persistMuteSound = (muted: boolean) => {
  const save = async () => {
    const csrfToken = document.querySelector("meta[name='csrf-token']")?.getAttribute('content');
    const response = await fetch('/api/v1/settings', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken ?? '',
      },
      body: JSON.stringify({ sound_settings: { muted } }),
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
  };

  muteSaveQueue = muteSaveQueue.catch(() => {}).then(save);
  return muteSaveQueue;
};

export const toggleMuteSound = () => async (dispatch: any, getState: any) => {
  const previousMuted = Boolean(getState().user.settings.mute);
  const muted = !previousMuted;

  sound.toggle(muted ? 0 : undefined);
  dispatch(actions.setMuteSound(muted));

  try {
    await persistMuteSound(muted);
  } catch {
    if (Boolean(getState().user.settings.mute) === muted) {
      sound.toggle(previousMuted ? 0 : undefined);
      dispatch(actions.setMuteSound(previousMuted));
    }
  }
};

export { actions };

export default reducer;
