import React, { useState } from 'react';

import { Rnd } from 'react-rnd';
import './BlockBase.css';
import '../../resize.css';

function BlockBase({
  id,
  x,
  y,
  width,
  height,
  onMove,
  onResize,
  isResizable,
  children,
  onContextMenu,
  onStopResize,
}) {
  const [tempSize, setTempSize] = useState({ width, height });

  const snap = (val, grid = 20) => Math.round(val / grid) * grid;

  return (
    <Rnd
      size={{ width, height }}
      position={{ x, y }}
      onDragStop={(e, d) => {
        onMove(d.x, d.y);
      }}
      onResize={(e, dir, ref) => {
        const newWidth = snap(ref.offsetWidth);
        const newHeight = snap(ref.offsetHeight);
        setTempSize({ width: newWidth, height: newHeight });
        onResize(newWidth, newHeight);
      }}
      onResizeStop={(e, dir, ref, delta, pos) => {
        const snappedWidth = snap(ref.offsetWidth);
        const snappedHeight = snap(ref.offsetHeight);
        const snappedX = snap(pos.x);
        const snappedY = snap(pos.y);

        onResize(snappedWidth, snappedHeight);
        onMove(snappedX, snappedY);

        if (onStopResize) onStopResize();
      }}
      enableResizing={isResizable}
      bounds="parent"
      style={{ zIndex: isResizable ? 10 : 1 }}
    >
      <div
        onContextMenu={onContextMenu}
        className="block-wrapper"
        data-id={id}
        style={{
          width: '100%',
          height: '100%',
          boxSizing: 'border-box',
          position: 'relative',
          border: isResizable ? '1px dashed #3b82f6' : '1px solid transparent',
          borderRadius: 6,
          transition: 'border 0.2s ease',
        }}
      >
        {children}

        {isResizable && (
          <>
            {['tl', 'tr', 'bl', 'br'].map(pos => (
              <div key={pos} className={`resize-dot ${pos}`} />
            ))}
            <div
              style={{
                position: 'absolute',
                bottom: -26,
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '14px',
                color: '#3b82f6',
                background: 'white',
                borderRadius: 8,
                padding: '2px 10px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                fontFamily: 'JetBrains Mono, monospace',
                pointerEvents: 'none',
              }}
            >
              {tempSize.width}
              {' '}
              ×
              {tempSize.height}
            </div>
          </>
        )}
      </div>
    </Rnd>
  );
}

export default BlockBase;
