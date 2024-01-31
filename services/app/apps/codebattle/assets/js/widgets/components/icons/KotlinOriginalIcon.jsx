import React from 'react';

const KotlinOriginalIcon = ({ className, size = '1em' }) => (
  <svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" className={className} style={{ width: size, height: size }}>
    <linearGradient id="kotlin-original-a" gradientUnits="userSpaceOnUse" x1="-11.899" y1="48.694" x2="40.299" y2="-8.322">
      <stop offset="0" stopColor="#1c93c1" />
      <stop offset=".163" stopColor="#2391c0" />
      <stop offset=".404" stopColor="#378bbe" />
      <stop offset=".696" stopColor="#587eb9" />
      <stop offset=".995" stopColor="#7f6cb1" />
    </linearGradient>
    <linearGradient id="kotlin-original-b" gradientUnits="userSpaceOnUse" x1="43.553" y1="149.174" x2="95.988" y2="94.876">
      <stop offset="0" stopColor="#1c93c1" />
      <stop offset=".216" stopColor="#2d8ebf" />
      <stop offset=".64" stopColor="#587eb9" />
      <stop offset=".995" stopColor="#7f6cb1" />
    </linearGradient>
    <linearGradient id="kotlin-original-c" gradientUnits="userSpaceOnUse" x1="3.24" y1="95.249" x2="92.481" y2="2.116">
      <stop offset="0" stopColor="#c757a7" />
      <stop offset=".046" stopColor="#ca5a9e" />
      <stop offset=".241" stopColor="#d66779" />
      <stop offset=".428" stopColor="#e17357" />
      <stop offset=".6" stopColor="#e97c3a" />
      <stop offset=".756" stopColor="#ef8324" />
      <stop offset=".888" stopColor="#f28817" />
      <stop offset=".982" stopColor="#f48912" />
    </linearGradient>
    <path fill="url(#kotlin-original-a)" d="M0 0h65.4L0 64.4z" />
    <path fill="url(#kotlin-original-b)" d="M128 128L64.6 62.6 0 128z" />
    <path fill="url(#kotlin-original-c)" d="M0 128L128 0H64.6L0 63.7z" />
  </svg>
);

export default KotlinOriginalIcon;
