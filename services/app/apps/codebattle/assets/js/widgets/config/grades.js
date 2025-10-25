export const grades = {
  open: 'open',
  rookie: 'rookie',
  challenger: 'challenger',
  pro: 'pro',
  elite: 'elite',
  masters: 'masters',
  grandSlam: 'grand_slam',
};

export const getRankingPoints = grade => {
  switch (grade) {
    case grades.rookie: return [8, 4, 2];
    case grades.challenger: return [16, 8, 4, 2];
    case grades.pro: return [128, 64, 32, 16, 8, 4, 2];
    case grades.elite: return [256, 128, 64, 32, 16, 8, 4, 2];
    case grades.masters: return [1024, 512, 256, 128, 64, 32, 16, 8, 4, 2];
    case grades.grandSlam: return [2048, 1024, 512, 256, 128, 64, 32, 16, 8, 4, 2];
    default: return [0];
  }
};

export const getTasksCount = grade => {
  switch (grade) {
    case grades.rookie: return 4;
    case grades.challenger: return 6;
    case grades.pro: return 8;
    case grades.elite: return 10;
    case grades.masters: return 12;
    case grades.grandSlam: return 14;
    default: return 0;
  }
};
