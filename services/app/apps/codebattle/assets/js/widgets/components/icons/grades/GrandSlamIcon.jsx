import React from 'react';

const COLOR_TEXT = '#FFD700'; // Gold for the caption

const GrandSlamIcon = ({ size = '48px' }) => (
  <div className="rank-icon-container">
    <svg
      className="rank-svg-icon aura-animation"
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: `drop-shadow(0 0 3px ${COLOR_TEXT})` }}
    >
      <defs>
        {/* Red-Gold Gradient Definition */}
        <linearGradient id="RG_Gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#FFD700', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#FF4500', stopOpacity: 1 }} />
        </linearGradient>
      </defs>

      {/* Trophy Symbol */}
      <g fill="url(#RG_Gradient)">
        {/* Trophy Base */}
        <rect x="35" y="70" width="30" height="5" rx="2" />
        {/* Trophy Stem */}
        <rect x="47.5" y="55" width="5" height="15" />
        {/* Trophy Bowl */}
        <path d="M30,55 C20,40 80,40 70,55 L70,55 C70,45 60,30 50,30 C40,30 30,45 30,55 Z" />
        {/* Shine highlight */}
        <circle cx="50" cy="45" r="5" fill="#FFFFFF" opacity="0.8" />
      </g>
    </svg>
  </div>
);

export default GrandSlamIcon;
