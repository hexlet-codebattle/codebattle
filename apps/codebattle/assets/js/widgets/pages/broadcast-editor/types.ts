export interface Block {
  id: string;
  type: 'code' | 'text' | 'timer';
  x: number;
  y: number;
  width: number;
  height: number;
  nick?: string;
  color?: string;
  code?: string;
  theme?: string;
  text?: string;
  time?: string;
}

export interface Presets {
  current?: string;
  [name: string]: Block[] | string | undefined;
}

// Common geometry/handler props shared by every block via BlockBase.
export interface BlockCommonProps {
  id: string;
  x: number;
  y: number;
  position?: { x: number; y: number };
  width: number;
  height: number;
  onContextMenu?: (e: React.MouseEvent) => void;
  onMove: (x: number, y: number) => void;
  onDrag?: (x: number, y: number) => void;
  onResize: (w: number, h: number) => void;
  isResizable: boolean;
  onStopResize?: () => void;
  onStopDrag?: () => void;
}
