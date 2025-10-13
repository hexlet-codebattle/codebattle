import React from 'react';

const COLOR = '#39FF14'; // Ярко-зелёный (Bright-green)

const ProIcon = ({ size = '48px' }) => (
  <div className="rank-icon-container">
    <svg
      className="rank-svg-icon blink-effect"
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: `drop-shadow(0 0 3px ${COLOR})` }}
    >
      {/* Chip with Blinking Tracks Symbol */}
      <rect x="20" y="20" width="60" height="60" rx="5" fill="#333" stroke={COLOR} strokeWidth="3" />
      {/* Blinking Lines/Tracks */}
      <line x1="30" y1="35" x2="70" y2="35" stroke={COLOR} strokeWidth="2" className="blink-line-1" />
      <line x1="30" y1="50" x2="70" y2="50" stroke={COLOR} strokeWidth="2" className="blink-line-2" />
      <line x1="30" y1="65" x2="70" y2="65" stroke={COLOR} strokeWidth="2" className="blink-line-3" />
    </svg>
  </div>
);
export default ProIcon;
