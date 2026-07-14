import type { SVGProps } from 'react';

export interface OriginalIconProps {
  className?: string;
  size?: number | string;
}

export interface GradeIconProps extends Omit<SVGProps<SVGSVGElement>, 'color'> {
  color?: string;
  size?: number | string;
  title?: string;
}

export interface GrandSlamIconProps extends GradeIconProps {
  animate?: boolean;
  glowColor?: string;
  intensity?: number;
  speed?: number;
}
