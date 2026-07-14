import { decamelizeKeys, camelizeKeys } from 'humps';
import map from 'lodash/map';
import remove from 'lodash/remove';
import { Presence, type Channel as PhoenixChannel, type Push } from 'phoenix';

import socket from '../../socket';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Listener = {
  ref: number | null;
  callback: (payload: any) => void;
  params: Record<string, any>;
};

type MessageHandler = (event: string, payload: any) => any;

const nonChannelErrorMessage = "Socket channel wasn't initialize";

const nonPresenceErrorMessage = "Socket channel presence wasn't initialize";

export default class Channel {
  listeners: Record<string, Listener[] | undefined> = {};

  channel: PhoenixChannel | undefined;

  presence: Presence | undefined;

  onMessageHandler: MessageHandler = (_event, payload) => payload;

  constructor(topic?: string, params?: Record<string, any>) {
    this.setupChannel(topic, params);
  }

  setupChannel(topic?: string, params?: Record<string, any>) {
    if (!topic) {
      return this;
    }

    if (this.channel && this.channel.topic === topic) {
      return this;
    }

    const channel: PhoenixChannel = socket.channel(
      topic,
      decamelizeKeys(params, { separator: '_' }),
    );

    channel.onMessage = (event: string, payload: any) => {
      // Preserve Phoenix Presence's `phx_ref`/`phx_ref_prev` keys — camelizing them
      // breaks Presence meta merging, collapsing multiple connections into one.
      const camelized = camelizeKeys(payload, (key: string, convert: (k: string) => string) =>
        key.startsWith('phx_') ? key : convert(key),
      );
      const result = this.onMessageHandler(event, camelized);

      return result;
    };

    this.channel = channel;
    this.presence = new Presence(channel);

    Object.keys(this.listeners).forEach((listenerTopic) => {
      const listeners = this.listeners[listenerTopic];
      if (listeners) {
        const newListeners = listeners.map((listener) => {
          const { cb } = listener as any;
          const ref = channel.on(listenerTopic, cb);

          return { ...listener, ref };
        });

        this.listeners[listenerTopic] = newListeners;
      }
    });

    return this;
  }

  addListener(topic: string, cb: (payload: any) => void, params: Record<string, any> = {}) {
    const currentListeners = this.listeners[topic];
    const newRef = this.channel ? this.channel.on(topic, cb) : null;
    const newListener: Listener = { ref: newRef, callback: cb, params };

    if (!currentListeners) {
      this.listeners[topic] = [newListener];
    } else {
      currentListeners.push(newListener);
    }

    return this;
  }

  removeListeners(topic?: string, params?: Record<string, any>) {
    if (!topic) {
      return this.clear();
    }

    if (!this.listeners[topic]) {
      return this;
    }

    this.off(topic, params);

    return this;
  }

  clear() {
    if (this.channel) {
      Object.keys(this.listeners).forEach((topic) => {
        this.off(topic);
      });
    }

    this.listeners = {};

    return this;
  }

  off(topic?: string, params?: Record<string, any>) {
    const { channel } = this;

    if (!channel) {
      throw new Error(nonChannelErrorMessage);
    }

    if (!topic || !this.listeners[topic]) {
      return this;
    }

    const removedListeners = params
      ? this.filterListenerByParams(topic, params)
      : this.listeners[topic];
    const removedRefs = map(removedListeners, 'ref');

    removedRefs.forEach((ref) => {
      channel.off(topic, ref);
    });

    remove(this.listeners[topic]!, (listener) => {
      removedRefs.includes(listener.ref);
    });

    if (this.listeners[topic]!.length === 0) {
      this.listeners[topic] = undefined;
    }

    return this;
  }

  filterListenerByParams(topic?: string, params: Record<string, any> = {}): Listener[] {
    if (!topic || !this.listeners[topic]) {
      return [];
    }

    return this.listeners[topic]!.filter(({ params: listenerParams }) => {
      const paramsKeys = Object.keys(params);

      for (let i = 0; i < paramsKeys.length; i += 1) {
        const key = paramsKeys[i];

        if (listenerParams[key] !== params[key]) {
          return false;
        }
      }

      return true;
    });
  }

  join(...params: any[]): Push {
    if (!this.channel) {
      throw new Error(nonChannelErrorMessage);
    }

    const pushInstance = this.channel.join(...params);

    return pushInstance;
  }

  leave(...params: any[]): Push {
    if (!this.channel) {
      throw new Error(nonChannelErrorMessage);
    }

    this.clear();

    const pushInstance = this.channel.leave(...params);

    this.channel = undefined;
    this.presence = undefined;
    this.onMessageHandler = (_event, payload) => payload;

    return pushInstance;
  }

  onError(cb: (reason?: unknown) => void) {
    if (!this.channel) {
      throw new Error(nonChannelErrorMessage);
    }

    this.channel.onError(cb);

    return this.channel;
  }

  onMessage(handler: MessageHandler) {
    if (typeof handler !== 'function') {
      throw new Error('Value must be a function');
    }

    this.onMessageHandler = handler;

    return this;
  }

  push(topic: string, params?: Record<string, any>): Push {
    if (!this.channel || !this.channel.joinedOnce) {
      const noop: Push = { receive: () => noop };
      return noop;
    }

    const pushInstance = this.channel.push(topic, decamelizeKeys(params, { separator: '_' }));

    pushInstance.receive('error', console.error);

    return pushInstance;
  }

  syncPresence(cb: (list: any[]) => void) {
    const { presence } = this;

    if (!this.channel) {
      throw new Error(nonChannelErrorMessage);
    }

    if (!presence) {
      throw new Error(nonPresenceErrorMessage);
    }

    presence.onSync(() => {
      const list = presence.list(this.listBy);

      cb(list);
    });

    return this;
  }

  get topic() {
    return this.channel?.topic;
  }

  listBy = (id: string, { metas: [first, ...rest] }: { metas: any[] }) => {
    const userInfo = {
      ...first,
      id: Number(id),
      count: rest.length + 1,
      userPresence: [first, ...rest],
    };

    return userInfo;
  };
}
