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
  rookie: '#00FF00', // Bright Neon Green
  challenger: '#00FF7F', // Spring Green
  pro: '#FFD700', // Bright Gold
  elite: '#FF8C00', // Vibrant Dark Orange
  masters: '#FF4500', // Bright Orange-Red
  grandSlam: '#FF0000', // Pure Bright Red
};

export const getIconForGrade = grade => {
  switch (grade) {
    case 'rookie':
      return <RookieIcon size="60px" color={colors.rookie} />;
    case 'challenger':
      return <ChallengerIcon size="60px" color={colors.challenger} />;
    case 'pro':
      return <ProIcon size="60px" color={colors.pro} />;
    case 'elite':
      return <EliteIcon size="60px" color={colors.elite} />;
    case 'masters':
      return <MastersIcon size="60px" color={colors.masters} />;
    case 'grand_slam':
      return <GrandSlamIcon size="60px" color={colors.grandSlam} />;
    default:
      return <RookieIcon size="60px" color={colors.rookie} />;
  }
};

export default getIconForGrade;
