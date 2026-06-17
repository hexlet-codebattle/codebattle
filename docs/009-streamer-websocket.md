# Streamer WebSocket (канал для стримеров турниров)

Отдельный WebSocket-эндпоинт, через который стример получает реалтайм-инфу
о турнире и активной игре. Канал read-only: стример только слушает, ничего
не отправляет на сервер.

## Подключение

- **URL:** `wss://<host>/ws-streamer/websocket?token=<API_KEY>&tournament_id=<ID>&vsn=2.0.0`
- **Параметры URL:**
  - `token` — значение из `Application.get_env(:codebattle, :api_key)`
    (переменная окружения `CODEBATTLE_API_AUTH_KEY`, тот же ключ, что
    использует `CodebattleWeb.Plugs.TokenAuth`).
  - `tournament_id` — id турнира (положительное целое; принимается строкой или числом).
- Если токен невалидный, отсутствует или `tournament_id` не парсится —
  сокет отвечает `:error` и соединение не устанавливается.
- При успешном подключении в assigns сокета пишется
  `streamer?: true` и `tournament_id: <integer>`.

Реализация: `apps/codebattle/lib/codebattle_web/channels/streamer_socket.ex`.

## Канал

- **Топик:** `tournament_streamer` (без id — он уже в `socket.assigns`)
- Перед джойном канал проверяет `socket.assigns.streamer?`. Если флага нет —
  ответ `{:error, %{reason: "unauthorized"}}`.
- Если турнира с таким id нет — `{:error, %{reason: "not_found"}}`.

Реализация: `apps/codebattle/lib/codebattle_web/channels/tournament_streamer_channel.ex`.

### Что приходит при джойне

```json
{
  "tournament": {
    "id": 123,
    "name": "...",
    "type": "swiss",
    "state": "active",
    "break_state": "off",
    "show_results": true,
    "players_count": 42,
    "current_round_position": 2,
    "last_round_started_at": "...",
    "last_round_ended_at": null,
    "starts_at": "...",
    "finished_at": null
  },
  "active_game": {
    "id": 456,
    "level": "easy",
    "state": "playing",
    "starts_at": "...",
    "finishes_at": "...",
    "timeout_seconds": 300,
    "duration_sec": null,
    "tournament_id": 123,
    "task": {
      "id": 7,
      "name": "asc-sort",
      "level": "easy",
      "description_en": "...",
      "description_ru": "...",
      "examples": "...",
      "asserts_examples": [...],
      "input_signature": [...],
      "output_signature": {...}
    },
    "players": [
      {
        "id": 1, "name": "alice",
        "is_bot": false, "lang": "ruby",
        "rank": 10, "rating": 1500,
        "result": null, "check_result": null
      },
      ...
    ]
  }
}
```

`active_game` берётся из `TournamentAdminChannel.get_active_game/1`
(агент, в котором админ хранит текущую "трансляционную" игру). Если админ
ещё ничего не выбрал — берётся первая `playing` игра турнира. Если игр нет,
поле приходит как `null`.

## Подписки на PubSub

Сразу после джойна канал подписывается на:

| Топик                                | Зачем                                  |
| ------------------------------------ | -------------------------------------- |
| `tournament:<id>:stream`             | смена активной игры админом            |
| `tournament:<id>:common`             | старт/конец раунда, финиш турнира      |
| `tournament:<id>`                    | общие апдейты турнира                  |
| `game:tournament:<id>`               | финиши **всех** игр этого турнира      |
| `game:<active_game_id>` *(если есть)*| проверки тестов и финиш активной игры  |

При смене активной игры старая подписка `game:<old_id>` отписывается, на
`game:<new_id>` подписываемся.

## События, которые получает стример

### `active_game:set`

Админ переключил трансляционную игру.

```json
{ "game_id": 789, "game": { ... как active_game из джойна ... } }
```

Если игру не удалось загрузить — `"game": null`.

### `active_game:check_result`

Прогон тестов на **текущей** активной игре (события для других игр
фильтруются и не приходят).

```json
{
  "game_id": 789,
  "user_id": 1,
  "check_result": { "asserts_count": 10, "success_count": 7, "status": "failure" }
}
```

### `active_game:finished`

Активная игра закончилась (кто-то выиграл / таймаут).

```json
{
  "game_id": 789,
  "game_state": "game_over",
  "players": [
    { "id": 1, "name": "alice", "result": "won", ... },
    { "id": 2, "name": "bob",   "result": "lost", ... }
  ]
}
```

### `tournament:game:finished`

Любая игра турнира финишировала — нужно, чтобы стример мог показывать
ленту побед по всему турниру, а не только по активной игре.

```json
{
  "game_id": 456,
  "task_id": 7,
  "game_state": "game_over",
  "game_level": "easy",
  "duration_sec": 124,
  "player_results": { "1": { "result": "won", ... }, "2": { "result": "lost", ... } }
}
```

### События уровня турнира

Пробрасываются как есть с укороченным payload (только поля из
`tournament_state/1`):

- `tournament:updated`
- `tournament:round_created`
- `tournament:round_finished`
- `tournament:finished`
- `tournament:restarted`

Формат: `{ "tournament": { id, name, type, state, ... } }`.

## Что **не** приходит

- Изменения кода в редакторе игроков (editor diffs, текущий текст решения).
- События чата.
- Внутренние ивенты движка игры, кроме `check_completed`/`finished`
  активной игры.

То есть лента стримера — это «эссеншл»: статус турнира, кто что прислал
в активной игре (упало/прошло — сколько ассертов), кто победил.

## Сообщения от клиента

`handle_in/3` молча игнорирует любые входящие пуши — стример ничего на
сервер слать не должен.

## Файлы

- Сокет: `apps/codebattle/lib/codebattle_web/channels/streamer_socket.ex`
- Канал: `apps/codebattle/lib/codebattle_web/channels/tournament_streamer_channel.ex`
- Регистрация: `apps/codebattle/lib/codebattle_web/endpoint.ex`
  (`socket("/ws-streamer", CodebattleWeb.StreamerSocket, ...)`)
- Тесты:
  - `apps/codebattle/test/codebattle_web/channels/streamer_socket_test.exs`
  - `apps/codebattle/test/codebattle_web/channels/tournament_streamer_channel_test.exs`
