import ru from '../../../priv/gettext/ru/LC_MESSAGES/default.po';

test('provides Russian translations for the reported interface strings', () => {
  expect(ru).toMatchObject({
    'View Hall of Fame': 'Посмотреть зал славы',
    'My Tournaments': 'Мои турниры',
    Achievements: 'Достижения',
    Calendar: 'Календарь',
    'Task Packs': 'Наборы задач',
    Clans: 'Кланы',
    'Game Type': 'Тип игры',
    'Time control': 'Контроль времени',
    Feedback: 'Обратная связь',
    'Send feedback': 'Отправить отзыв',
    'Opponent has left': 'Соперник покинул игру',
    'Are you sure you want to give up?': 'Вы уверены, что хотите сдаться?',
    Rematch: 'Реванш',
  });
});
