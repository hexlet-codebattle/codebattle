/// <reference types="vite/client" />

declare module '*.po' {
  const messages: Record<string, string>;
  export default messages;
}

declare module '/node_modules/monaco-editor/*';

declare module 'nprogress' {
  const NProgress: {
    start(): void;
    done(): void;
  };

  export default NProgress;
}

// `monaco-themes` ships the theme list as a JSON asset without an exported
// subpath type, so TypeScript can't resolve it. Declare it as a name->label map.
declare module 'monaco-themes/themes/themelist.json' {
  const themeList: Record<string, string>;
  export default themeList;
}

// `react-calendar-heatmap` ships no type declarations and no
// @types/react-calendar-heatmap is installed. Provide a minimal ambient
// declaration covering the props used across the app.
declare module 'react-calendar-heatmap' {
  import type * as React from 'react';

  export interface ReactCalendarHeatmapValue {
    date: string;
    count?: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  }

  export interface CalendarHeatmapProps {
    values: ReactCalendarHeatmapValue[];
    startDate?: Date | string | number;
    endDate?: Date | string | number;
    showWeekdayLabels?: boolean;
    classForValue?: (value: ReactCalendarHeatmapValue | null) => string;
    titleForValue?: (value: ReactCalendarHeatmapValue | null) => string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  }

  const CalendarHeatmap: React.FC<CalendarHeatmapProps>;
  export default CalendarHeatmap;
}

// CSRF token injected onto the global window object by the server-rendered page.
interface Window {
  csrf_token?: string;
}

// `humps` ships no type declarations and no @types/humps is installed.
declare module 'humps' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Converter = (key: string, convert: (key: string) => string) => string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function camelizeKeys(object: any, options?: Converter | Record<string, any>): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function decamelizeKeys(object: any, options?: Record<string, any>): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function camelize(value: string): string;
  export function decamelize(value: string, options?: Record<string, unknown>): string;
}

// `qs` ships no bundled declarations here and no @types/qs is installed.
declare module 'qs' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function stringify(obj: any, options?: Record<string, any>): string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function parse(str: string, options?: Record<string, any>): any;
}

// `howler` ships no type declarations and no @types/howler is installed.
declare module 'howler' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export class Howl {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(options: any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    play(spriteOrId?: string | number): number;
    volume(volume?: number): number | this;
    stop(id?: number): this;
  }
  export const Howler: {
    volume(volume?: number): number;
    stop(): void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
}

// The `phoenix` npm package ships no type declarations and no @types/phoenix
// is installed. Provide a minimal ambient declaration covering the Socket,
// Channel and Presence surface used across the app.
declare module 'phoenix' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type PushReceiveStatus = 'ok' | 'error' | 'timeout' | string;

  export interface Push {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    receive(status: PushReceiveStatus, callback: (response?: any) => void): Push;
  }

  export class Channel {
    topic: string;
    joinedOnce: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onMessage: (event: string, payload: any, ref?: any) => any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    join(...args: any[]): Push;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    leave(...args: any[]): Push;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    push(event: string, payload?: any): Push;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    on(event: string, callback: (payload: any) => void): number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    off(event: string, ref?: any): void;
    onError(callback: (reason?: unknown) => void): void;
    onClose(callback: () => void): void;
  }

  export class Socket {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(endPoint: string, opts?: any);
    connect(): void;
    disconnect(): void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    channel(topic: string, params?: any): Channel;
  }

  export class Presence {
    constructor(channel: Channel);
    onSync(callback: () => void): void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    list<T = any>(by?: (id: string, presence: any) => T): T[];
  }
}

// `react-transition-group` ships no bundled declarations here and no
// @types/react-transition-group is installed. Provide a minimal ambient
// declaration covering the CSSTransition/SwitchTransition components used.
declare module 'react-transition-group' {
  import type * as React from 'react';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const CSSTransition: React.ComponentType<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const SwitchTransition: React.ComponentType<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const Transition: React.ComponentType<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const TransitionGroup: React.ComponentType<any>;
}

// `react-big-calendar` ships no bundled declarations here and no
// @types/react-big-calendar is installed. Provide a minimal ambient
// declaration covering the Calendar component and localizer used.
declare module 'react-big-calendar' {
  import type * as React from 'react';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function dayjsLocalizer(dayjs: any): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const Calendar: React.ComponentType<any>;
}

// `react-syntax-highlighter` ships no bundled declarations here and no
// @types/react-syntax-highlighter is installed. Provide a minimal ambient
// declaration covering the Prism highlighter and prism style presets used.
declare module 'react-syntax-highlighter' {
  import type * as React from 'react';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const Prism: React.ComponentType<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const Light: React.ComponentType<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SyntaxHighlighter: React.ComponentType<any>;
  export default SyntaxHighlighter;
}

declare module 'react-syntax-highlighter/dist/esm/styles/prism' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const styles: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const vscDarkPlus: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const okaidia: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const coy: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const duotoneDark: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const tomorrow: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const atomDark: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const prism: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const solarizedlight: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const gruvboxDark: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const gruvboxLight: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const materialDark: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const materialLight: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const oneDark: any;
  export default styles;
}

// `react-player-controls` ships no bundled declarations here and no
// @types/react-player-controls is installed. Provide a minimal ambient
// declaration covering the Slider component used by the replayer.
declare module 'react-player-controls' {
  import type * as React from 'react';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const Slider: React.ComponentType<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const Direction: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const PlayerIcon: any;
}

declare module 'react-player-controls/dist/constants' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const Direction: any;
}
