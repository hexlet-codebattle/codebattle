import React from 'react';

const COLOR = '#FFBF00'; // Янтарно-оранжевый (Amber-orange)

const EliteIcon = ({ size = '48px' }) => (
  <div className="rank-icon-container">
    <svg
      className="rank-svg-icon aura-animation"
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: `drop-shadow(0 0 3px ${COLOR})` }}
    >
      {/* Neural Network / Graph Symbol */}
      <g fill={COLOR} stroke={COLOR} strokeWidth="3">
        <circle cx="30" cy="50" r="5" />
        <circle cx="50" cy="30" r="5" />
        <circle cx="50" cy="70" r="5" />
        <circle cx="70" cy="50" r="5" />
        <line x1="30" y1="50" x2="50" y2="30" />
        <line x1="30" y1="50" x2="50" y2="70" />
        <line x1="50" y1="30" x2="70" y2="50" />
        <line x1="50" y1="70" x2="70" y2="50" />
      </g>
    </svg>
  </div>
);
export default EliteIcon;
