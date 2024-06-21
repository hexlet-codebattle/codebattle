import React from 'react';

function EditorResultIcon({ children, mode = 'default' }) {
  const style = mode === 'default' ? {
    bottom: '5%',
    right: '5%',
    opacity: '0.5',
    zIndex: '100',
  } : {
    bottom: '5%',
    right: '5%',
    opacity: '0.5',
    zIndex: '100',
  };

  return (
    <div
      className="position-absolute"
      style={style}
    >
      {children}
    </div>
  );
}

export default EditorResultIcon;
