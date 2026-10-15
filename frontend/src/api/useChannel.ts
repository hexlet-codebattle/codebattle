import type { Channel } from 'phoenix';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useLatest } from '@/shared/useLatest';
import { useSharedProps } from '@/shared/useSharedProps';

import { getSocket } from './socket';

export type ChannelStatus = 'joining' | 'joined' | 'error';

type Handler = (payload: any) => void;

interface UseChannelOptions {
  params?: Record<string, unknown>;
  /** Called with the join reply on every (re)join, so state can be reset from it. */
  onJoin?: Handler;
  /** Server push event name → handler. Handlers may change between renders. */
  events?: Record<string, Handler>;
}

/**
 * Joins `topic` for the lifetime of the component (or until `topic` changes).
 * Handlers are read through a ref, so passing inline functions never rejoins.
 */
export function useChannel(topic: string | null, { params, onJoin, events = {} }: UseChannelOptions = {}) {
  const { user_token: token } = useSharedProps();
  const [status, setStatus] = useState<ChannelStatus>('joining');
  const channelRef = useRef<Channel | null>(null);
  const handlersRef = useLatest({ onJoin, events });

  const eventNames = Object.keys(events).sort().join(',');

  useEffect(() => {
    if (!topic) return undefined;

    const channel = getSocket(token).channel(topic, params ?? {});
    channelRef.current = channel;
    setStatus('joining');

    const refs = eventNames
      .split(',')
      .filter(Boolean)
      .map((event) => ({
        event,
        ref: channel.on(event, (payload) => handlersRef.current.events[event]?.(payload)),
      }));

    channel
      .join()
      .receive('ok', (reply) => {
        setStatus('joined');
        handlersRef.current.onJoin?.(reply);
      })
      .receive('error', () => setStatus('error'));

    channel.onError(() => setStatus('error'));
    // Phoenix rejoins automatically; the join 'ok' above fires again and flips status back.

    return () => {
      refs.forEach(({ event, ref }) => channel.off(event, ref));
      channel.leave();
      channelRef.current = null;
    };
    // params are fixed per topic by convention; eventNames tracks handler keys.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic, token, eventNames]);

  const push = useCallback(
    <Reply = unknown>(event: string, payload: Record<string, unknown> = {}) =>
      new Promise<Reply>((resolve, reject) => {
        const channel = channelRef.current;

        if (!channel) {
          reject(new Error(`Channel ${topic} is not joined`));
          return;
        }

        channel
          .push(event, payload)
          .receive('ok', resolve)
          .receive('error', reject)
          .receive('timeout', () => reject(new Error('timeout')));
      }),
    [topic],
  );

  /** Fire-and-forget push for events the server never replies to. */
  const cast = useCallback((event: string, payload: Record<string, unknown> = {}) => {
    channelRef.current?.push(event, payload);
  }, []);

  return { status, push, cast };
}
