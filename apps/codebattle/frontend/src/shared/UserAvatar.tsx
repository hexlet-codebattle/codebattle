import { Avatar, type AvatarProps } from '@mantine/core';
import { useId, useMemo } from 'react';

import * as palettes from '@/theme/colors';

import { avatarTraits, coderAvatarSvg } from './coderAvatar';

// Legacy placeholder stored as avatar_url for users without a photo.
const isPlaceholder = (src: string | null | undefined) => !src || src.endsWith('/logo.svg');

/** The playful default "coder" for `seed` (a user id); see coderAvatar.ts. */
export function CoderAvatar({ seed }: { seed: number }) {
  const uid = useId().replace(/:/g, '');
  const markup = useMemo(() => {
    const palette = palettes[avatarTraits(seed).hue];
    return coderAvatarSvg(seed, (n) => palette[n], uid);
  }, [seed, uid]);

  // Generated locally from a number, never from user input.
  return <span style={{ display: 'block', width: '100%', height: '100%' }} dangerouslySetInnerHTML={{ __html: markup }} />;
}

interface UserAvatarProps extends Omit<AvatarProps, 'src' | 'children'> {
  user: { id: number; avatar_url?: string | null };
}

/** The user's photo, or their coder avatar when they have none (or it fails to load). */
export function UserAvatar({ user, ...props }: UserAvatarProps) {
  return (
    <Avatar src={isPlaceholder(user.avatar_url) ? null : user.avatar_url} {...props}>
      <CoderAvatar seed={user.id} />
    </Avatar>
  );
}
