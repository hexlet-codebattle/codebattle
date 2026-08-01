import i18n from '../../i18n';
import { getGradeLabel, grades } from '../config/grades';

const gradeValues = Object.values(grades);

const normalizeGrade = (value: string) => value.toLowerCase().replaceAll(' ', '_');

const getKnownGrade = (value: string | undefined) => {
  if (!value) return undefined;

  const normalized = normalizeGrade(value);

  return gradeValues.includes(normalized) ? normalized : undefined;
};

export const localizeTournamentName = (name: string | undefined, grade?: string) => {
  if (!name) return name;

  const knownGrade = getKnownGrade(grade);

  if (knownGrade && normalizeGrade(name) === knownGrade) {
    return i18n.t(getGradeLabel(knownGrade));
  }

  const generatedName = name.match(
    /^(rookie|challenger|pro|elite|masters|grand[_ ]slam) tournament #(\d+)$/i,
  );

  if (!generatedName) return name;

  const generatedGrade = normalizeGrade(generatedName[1]);

  return i18n.t('%{grade} Tournament #%{number}', {
    grade: i18n.t(getGradeLabel(generatedGrade)),
    number: generatedName[2],
  });
};
