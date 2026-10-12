import challenger from '@/assets/grades/challenger.svg';
import elite from '@/assets/grades/elite.svg';
import grandSlam from '@/assets/grades/grand_slam.svg';
import masters from '@/assets/grades/masters.svg';
import pro from '@/assets/grades/pro.svg';
import rookie from '@/assets/grades/rookie.svg';

import type { TournamentGrade } from '../types';

import classes from './GradeIcon.module.css';

const ICONS: Partial<Record<TournamentGrade, string>> = {
  rookie,
  challenger,
  pro,
  elite,
  masters,
  grand_slam: grandSlam,
};

/** Season grade trophy, tinted with the grade colour (`--cb-grade-*`); nothing for open (user) tournaments. */
export function GradeIcon({ grade, size = 56 }: { grade: TournamentGrade; size?: number }) {
  const icon = ICONS[grade];
  const color = `var(--cb-grade-${grade}, var(--cb-text-muted))`;

  if (!icon) return null;

  return (
    <span
      role="img"
      aria-label={grade}
      className={classes.icon}
      style={{ width: size, height: size, backgroundColor: color, maskImage: `url(${JSON.stringify(icon)})`, WebkitMaskImage: `url(${JSON.stringify(icon)})` }}
    />
  );
}
