import { decamelizeKeys } from 'humps';
import map from 'lodash/map';
import remove from 'lodash/remove';
import { Presence } from 'phoenix';

import socket from '../../socket';

const nonChannelErrorMessage = "Socket channel wasn't initialize";

const nonPresenceErrorMessage = "Socket channel presence wasn't initialize";

export default class Channel {
  listeners = {};

  channel;

  presence;

  constructor(topic, params) {
    const channel = socket.channel(
      topic,
      decamelizeKeys(params, { separator: '_' }),
    );

    this.channel = channel;
    this.presence = new Presence(channel);
  }

  addListener(topic, cb, params = {}) {
    if (!this.channel) {
      throw new Error(nonChannelErrorMessage);
    }

    const currentListeners = this.listeners[topic];
    const newRef = this.channel.on(topic, cb);
    const newListener = { ref: newRef, callback: cb, params };

    if (!currentListeners) {
      this.listeners[topic] = [newListener];
    } else {
      currentListeners.push(newListener);
    }

    return this;
  }

  clearListeners(topic, params) {
    if (!this.channel) {
      throw new Error(nonChannelErrorMessage);
    }

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
      Object.keys(this.listeners).forEach(topic => {
        this.off(topic);
      });
    }

    this.listeners = {};

    return this;
  }

  off(topic, params) {
    if (!this.channel) {
      throw new Error(nonChannelErrorMessage);
    }

    if (!topic || !this.listeners[topic]) {
      return this;
    }

    const removedListeners = params
      ? this.filterListenerByParams(topic, params)
      : this.listeners[topic];
    const removedRefs = map(removedListeners, 'ref');

    removedRefs.forEach(ref => {
      this.channel.off(topic, ref);
    });

    remove(this.listeners[topic], listener => {
      removedRefs.includes(listener.ref);
    });

    if (this.listeners[topic].length === 0) {
      this.listeners[topic] = undefined;
    }

    return this;
  }

  filterListenerByParams(topic, params = {}) {
    if (!topic || !this.listeners[topic]) {
      return [];
    }

    return this.listeners[topic].filter(({ params: listenerParams }) => {
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

  join(...params) {
    if (!this.channel) {
      throw new Error(nonChannelErrorMessage);
    }

    const pushInstance = this.channel.join(...params);

    return pushInstance;
  }

  leave(...params) {
    if (!this.channel) {
      throw new Error(nonChannelErrorMessage);
    }

    this.clear();

    const pushInstance = this.channel.leave(...params);

    this.channel = undefined;
    this.presence = undefined;

    return pushInstance;
  }

  onError(cb) {
    if (!this.channel) {
      throw new Error(nonChannelErrorMessage);
    }

    this.channel.onError(cb);

    return this.channel;
  }

  onMessage(cb) {
    if (!this.channel) {
      throw new Error(nonChannelErrorMessage);
    }

    this.channel.onMessage = cb;

    return this;
  }

  push(topic, params) {
    if (!this.channel) {
      throw new Error(nonChannelErrorMessage);
    }

    return this.channel.push(
      topic,
      decamelizeKeys(params, { separator: '_' }),
    );
  }

  syncPresence(cb) {
    if (!this.channel) {
      throw new Error(nonChannelErrorMessage);
    }

    if (!this.presence) {
      throw new Error(nonPresenceErrorMessage);
    }

    this.presence.onSync(() => {
      const list = this.presence.list(this.listBy);

      cb(list);
    });

    return this;
  }

  listBy = (id, { metas: [first, ...rest] }) => {
    const userInfo = {
      ...first,
      id: Number(id),
      count: rest.length + 1,
      userPresence: [first, ...rest],
    };

    return userInfo;
  }
}
