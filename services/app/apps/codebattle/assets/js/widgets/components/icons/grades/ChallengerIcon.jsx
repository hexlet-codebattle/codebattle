import React from 'react';

const COLOR = '#CCFF00'; // Лайм-жёлтый (Lime-yellow)

const ChallengerIcon = ({ size = '48px' }) => (
  <div className="rank-icon-container">
    <svg
      className="rank-svg-icon rotate-animation"
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: `drop-shadow(0 0 3px ${COLOR})` }}
    >
      {/* Rotating Gear Symbol */}
      <g fill={COLOR}>
        <circle cx="50" cy="50" r="30" />
        <circle cx="50" cy="50" r="10" fill="#000" />
        <rect x="45" y="15" width="10" height="20" rx="2" transform="rotate(0 50 50)" />
        <rect x="45" y="15" width="10" height="20" rx="2" transform="rotate(60 50 50)" />
        <rect x="45" y="15" width="10" height="20" rx="2" transform="rotate(120 50 50)" />
        <rect x="45" y="15" width="10" height="20" rx="2" transform="rotate(180 50 50)" />
        <rect x="45" y="15" width="10" height="20" rx="2" transform="rotate(240 50 50)" />
        <rect x="45" y="15" width="10" height="20" rx="2" transform="rotate(300 50 50)" />
      </g>
    </svg>
  </div>
);
export default ChallengerIcon;
