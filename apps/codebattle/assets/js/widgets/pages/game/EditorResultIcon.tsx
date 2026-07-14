import React, { type ReactNode } from 'react';

interface EditorResultIconProps {
  children: ReactNode;
  mode?: string;
}

function EditorResultIcon({ children, mode = 'default' }: EditorResultIconProps) {
  const style =
    mode === 'default'
      ? {
          bottom: '11%',
          right: '5%',
          opacity: '0.5',
          zIndex: '100',
        }
      : {
          bottom: '11%',
          right: '5%',
          opacity: '0.5',
          zIndex: '100',
        };

  return (
    <div className="position-absolute" style={style}>
      {children}
    </div>
  );
}

export default EditorResultIcon;
