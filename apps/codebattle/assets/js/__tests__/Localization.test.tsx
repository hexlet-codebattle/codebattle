import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';

import i18n from '../i18n';
import dayjs from '../i18n/dayjs';
import AchievementBadge from '../widgets/components/AchievementBadge';
import InvitesList from '../widgets/components/InvitesList';
import TournamentDescription from '../widgets/components/TournamentDescription';
import TournamentPreviewPanel from '../widgets/components/TournamentPreviewPanel';
import { localizeTournamentName } from '../widgets/utils/localizeTournamentName';

import { MantineTestProvider } from './helpers/mantine';

const translations = [
  ['Points', 'Очки'],
  ['Today', 'Сегодня'],
  ['Back', 'Назад'],
  ['Next', 'Далее'],
  ['Month', 'Месяц'],
  ['Day', 'День'],
  ['Agenda', 'Расписание'],
  ['Season Points Distribution', 'Распределение очков сезона'],
  ['Duration', 'Длительность'],
  ['Winner', 'Победитель'],
  ['Ranking Points', 'Рейтинговые очки'],
  ['Tournament chat', 'Чат турнира'],
  ['Easy', 'Лёгкий'],
  ['Tournament: %{name}', 'Турнир: %{name}'],
  ['Open Tournament', 'Открыть турнир'],
  ['View League Ranking Points System', 'Система рейтинговых очков лиги'],
  ['Replay settings', 'Настройки повтора'],
  ['Tournament details', 'Подробности турнира'],
  ['Function Signature', 'Сигнатура функции'],
  ['Fastest Solutions', 'Самые быстрые решения'],
  ['Forgot your password?', 'Забыли пароль?'],
  ['Restricted Content', 'Ограниченный доступ'],
  ['No completed games', 'Нет завершённых игр'],
  ['Live tournaments', 'Активные турниры'],
  ['Editor settings', 'Настройки редактора'],
  ['Start tournament confirmation', 'Подтверждение запуска турнира'],
] as const;

beforeAll(async () => {
  await i18n.changeLanguage('ru');
  dayjs.locale('ru');
});

afterAll(async () => {
  await i18n.changeLanguage('en');
  dayjs.locale('en');
});

test.each(translations)('translates %s into Russian', (key, translation) => {
  expect(i18n.t(key)).toBe(translation);
});

test('localizes the best streak achievement', () => {
  render(<AchievementBadge achievement={{ type: 'best_win_streak', meta: { count: 7 } }} />);

  expect(screen.getByText('Лучшая серия')).toBeInTheDocument();
  expect(screen.getByTitle('Лучшая серия побед')).toBeInTheDocument();
});

test('localizes the empty invites state', () => {
  const store = configureStore({ reducer: () => ({}) });

  render(
    <Provider store={store}>
      <MantineTestProvider>
        <InvitesList list={[]} currentUserId={1} />
      </MantineTestProvider>
    </Provider>,
  );

  expect(screen.getByText('Нет приглашений')).toBeInTheDocument();
});

test('localizes tournament preview dates and point labels', () => {
  render(
    <MantineTestProvider>
      <TournamentPreviewPanel
        tournament={{ grade: 'rookie' }}
        start="2026-08-05T02:00:00"
        end="2026-08-05T02:15:00"
      />
    </MantineTestProvider>,
  );

  expect(screen.getByText('Дата начала: 5 августа 2026')).toBeInTheDocument();
  expect(screen.getByText('Время: 02:00 - 02:15')).toBeInTheDocument();
  expect(screen.getByText('Очки за первое место: 8')).toBeInTheDocument();
});

test('localizes tournament highlights and grade names', () => {
  render(
    <MantineTestProvider>
      <TournamentDescription tournament={{ grade: 'rookie' }} />
    </MantineTestProvider>,
  );

  expect(screen.getByText('Главное о турнире:')).toBeInTheDocument();
  expect(screen.getByText('Задачи: 4 уникальных алгоритмических задач')).toBeInTheDocument();
  expect(screen.getByText('Система рейтинговых очков лиги')).toBeInTheDocument();
  expect(screen.getByText('Новичок(*)')).toBeInTheDocument();
  expect(screen.getByText('Челленджер')).toBeInTheDocument();
  expect(screen.getByText('Гранд-слэм')).toBeInTheDocument();
});

test('localizes only system-generated tournament names', () => {
  expect(localizeTournamentName('Challenger Tournament #12', 'challenger')).toBe(
    'Турнир «Челленджер» №12',
  );
  expect(localizeTournamentName('Grand_slam Tournament #9', 'grand_slam')).toBe(
    'Турнир «Гранд-слэм» №9',
  );
  expect(localizeTournamentName('Rookie', 'rookie')).toBe('Новичок');
  expect(localizeTournamentName('My custom tournament', 'rookie')).toBe('My custom tournament');
});
