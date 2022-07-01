# Codebattle ROADMAP

🚀 &nbsp;**OPEN** &nbsp;&nbsp;📉 &nbsp;&nbsp;**3 / 6** goals completed **(50%)** &nbsp;&nbsp;📅 &nbsp;&nbsp;**Sat Oct 01 2016**

| Status | Goal | Labels | Repository |
| :---: | :--- | --- | --- |
| ❌ | [Define options for the Mechanics of Tracking Project Milestones](https://github.com/ipfs/pm/issues/154) |`in progress`| <a href=https://github.com/ipfs/pm>ipfs/pm</a> |
| ❌ | [Test out the PM Process on go-ipfs Project](https://github.com/ipfs/pm/issues/153) |`ready`| <a href=https://github.com/ipfs/pm>ipfs/pm</a> |
| ✔ | [Overhaul README](https://github.com/ipfs/pm/pull/136) | | <a href=https://github.com/ipfs/pm>ipfs/pm</a> |
| ✔ | [(WIP) Project Management Process document](https://github.com/ipfs/pm/pull/131) | | <a href=https://github.com/ipfs/pm>ipfs/pm</a> |
| ❌ | [Project Management Process discussion](https://github.com/ipfs/pm/issues/125) |`in progress`| <a href=https://github.com/ipfs/pm>ipfs/pm</a> |

1. Add Roadmap

1. Lobby page:
    - Получать и отображать в табло изменения по турнирам. Начало турнира и тд
      - BE Сделать пуши с бекенда по событиям турнира в топик `tournaments`
      - BE Подписаться в lobby channel на события турниров
      - FE написать редукторы для всех сыбытий турниров
    - Форма создания игры
      - Добавить выбор таска в форму
        - BE апи для списка тасков с поиском по подстроке
        - FE Скопировать choose opponent для выбора тасков
        сделать выбол левела disable при выборе таска из списка
        и обнуление селектора, если выбран левел
        - FE сделать ползунок для выбора таймаута 1час - 1 минута, вместо квадратиков
    - Сделать в лобби ченел информацию об играх(статусы запуска, количество вьверов)
      - BE выпилить activeGames, поставить просто Sup.get_children
    Сделать редактирование announcement

1. Tournament page:
  - сделать турниры на реакте
  - сделать турнир stairways
  - переименовать кнопку join , и сделать оповещение о старте турнира

