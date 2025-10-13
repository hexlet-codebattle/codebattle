import React from 'react';

const COLOR = '#00FF00'; // Неоново-зелёный (Neon-green)

const RookieIcon = ({ size = '48px' }) => (
  <div className="rank-icon-container">
    <svg
      className="rank-svg-icon flicker-animation"
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: `drop-shadow(0 0 3px ${COLOR})` }}
    >
      {/* Floppy Disk/Terminal Cursor Symbol */}
      <rect x="25" y="25" width="50" height="50" rx="5" fill="none" stroke={COLOR} strokeWidth="4" />
      <rect x="35" y="45" width="30" height="15" fill="#000" stroke={COLOR} strokeWidth="2" />
      <rect x="40" y="30" width="20" height="10" fill={COLOR} />
    </svg>
  </div>
);
export default RookieIcon;
