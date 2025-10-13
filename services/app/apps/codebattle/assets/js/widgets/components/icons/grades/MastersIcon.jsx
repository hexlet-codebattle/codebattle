import React from 'react';

const COLOR = '#FFD700'; // Золотой (Gold)

const MastersIcon = ({ size = '48px' }) => (
  <div className="rank-icon-container">
    <svg
      className="rank-svg-icon pulse-animation"
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: `drop-shadow(0 0 3px ${COLOR})` }}
    >
      {/* Brain-Infinity Symbol */}
      <path
        d="M20,50 C20,25 40,25 50,50 C60,75 80,75 80,50 S60,25 50,50 S40,75 20,50 Z"
        fill="none"
        stroke={COLOR}
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  </div>
);
export default MastersIcon;
