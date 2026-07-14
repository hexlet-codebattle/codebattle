export interface AchievementMeta {
  count?: number | string;
  grade?: string;
  label?: number | string;
  languages?: string[];
}

export interface Achievement {
  meta?: AchievementMeta;
  type: string;
}
