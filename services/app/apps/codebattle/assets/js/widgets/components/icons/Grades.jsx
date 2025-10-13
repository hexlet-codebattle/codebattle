import React from 'react';

import ChallengerIcon from './grades/ChallengerIcon';
import EliteIcon from './grades/EliteIcon';
import GrandSlamIcon from './grades/GrandSlamIcon';
import MastersIcon from './grades/MastersIcon';
import ProIcon from './grades/ProIcon';
import RookieIcon from './grades/RookieIcon';

// Common SVG attributes for styling consistency
export const commonCircleStrokeWidth = 2;
export const binaryFontSize = 8;
export const binaryLetterSpacing = 0.7; // Adjusted for better fit

// --- Color Palette from earlier interpolation ---
export const colors = {
  rookie: '#32CD32', // Neon Green
  challenger: '#57BB3D', // Lime Yellow-Green
  pro: '#7DA948', // Bright Yellow-Green
  elite: '#A28953', // Amber Orange-Yellow (Masters in old list, now Elite)
  masters: '#C86345', // Gold Pulsating (Elite in old list, now Masters)
  grandSlam: '#EE3737', // Red-Gold (Grand Slam)
};

// Binary values based on MAX or a progression (e.g., powers of 2, 1, 2, 4, 8, 16, 32)
export const binaryValues = {
  rookie: '00001000', // MAX 8
  challenger: '01000000', // MAX 64
  pro: '10000000', // MAX 128
  elite: '11111111', // MAX 256 (2^8-1 for visual density)
  masters: '0000010000000000', // MAX 1024 (more digits for higher rank)
  grandSlam: '0000101101100000', // MAX 2848 (more digits for higher rank)
};

export const getIconForGrade = grade => {
  switch (grade) {
    case 'rookie': return <RookieIcon size="60px" />;
    case 'challenger': return <ChallengerIcon size="60px" />;
    case 'pro': return <ProIcon size="60px" />;
    case 'elite': return <EliteIcon size="60px" />;

    case 'masters': return <MastersIcon size="60px" />;
    case 'grand_slam': return <GrandSlamIcon size="60px" />;
    default: return <RookieIcon size="60px" />;
  }
};

export default getIconForGrade;
