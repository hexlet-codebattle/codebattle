# План: публичное API, дорешивание, ссылки в онлайне, язык D

Источник: обсуждение с организаторами (гантлеты, запросы участников).
Вне скоупа: `delay`, Telegram-бот.

| # | Что | Зачем | Оценка |
|---|-----|-------|--------|
| 0 | ✅ Закрыть подтверждённые дыры в `/api/v1`: `access_token`, накрутка `grade`, скрытые пакеты и задачи, `game_passwords` | security, блокер для публичного API | сделано, осталась проверка прода |
| 0b | ✅ Исключённый (кик/бан) игрок держал раунд; бан в игре не проверялся на сервере | баг от организаторов | сделано |
| 1 | ✅ Ссылки на игру/турнир в списке онлайна | просили, дёшево | сделано |
| 2 | ✅ Проверка решения после таймаута (пока жив процесс игры) | «дослать решение после тура» | сделано |
| 3 | ✅ Узкое Public API v1 «вокруг меня»: токены со скоупами, создание приватных турниров и игр, квоты, аудит, OpenAPI | гантлеты, CLI, боты | сделано (с упрощениями) |
| 4 | ✅ Язык D | повторяющийся запрос | сделано, образ не опубликован |

Статус (2026-10-10): все фазы реализованы в рабочей копии, ничего не закоммичено.
Проверки: ExUnit — runner 192, codebattle 1223 passed; vitest — 175 passed; `mix format`,
`credo --strict`, `tsc --noEmit` чистые, oxlint без новых предупреждений. Миграция применена к
dev-базе. Ниже, в «Итогах реализации», — отклонения от плана и что осталось сделать руками.

## Итоги реализации (2026-10-10)

**Фаза 1 — как в плане.** `MainChannel.presence_link/1` кладёт в presence-meta
санитизированный `link`: публичная игра (не `hidden`, флаг `user_only_see_own_games`
выключен) или турнир, иначе `nil`. `path` остаётся для админки. На фронте `getMajorMeta`
(`Main.ts`) и иконка-ссылка в `LobbyChat.tsx`, плюс новая группа «In tournament». Тесты:
`main_channel_test.exs`, `Main.test.ts`.

**Фаза 2 — как в плане, с упрощениями.**
- `Engine.check_result`: в `timeout` → `post_timeout_check/2` (только игроки, флаг
  `:post_timeout_check_disabled`, без переходов FSM, playbook и глобальных событий).
  `timeout_termination_delay/1` переименован в публичный `post_timeout_minutes/1`.
- Канал отдаёт `post_timeout: true` в `user:check_complete`. Вывод помечается «Проверка после
  окончания времени: на результат не влияет», и эту плашку видят все в игре: она заменяет
  отдельный бейдж соперника.
- Отказ сервера (`game_is_dead`) → в выводе «время на проверку вышло». Новое событие
  `check_rejected` в editor machine, иначе редактор висел бы в «checking» 50 секунд.
- **Не сделано:** `post_timeout_check_until` и обратный отсчёт у кнопки. Кнопка просто
  доступна, пока сервер принимает проверки.
- Тесты: `game/context_test.exs` (проверка после таймаута не меняет результаты, не-игрок → ошибка,
  после terminate → `game_is_dead`), `EditorContainer.test.tsx`.

**Фаза 3 — сделано, но OpenAPI упрощён.**
- Сделано по плану: `user_api_tokens` + `UserApiToken` (хеш, префикс `cbp_`, скоупы, срок;
  write-скоупы только для аккаунтов старше 7 дней и только со сроком действия; отзыв при смене
  пароля и архивации; бан и архив выключают токен сразу). Плаги
  `Plugs.PublicApi.TokenAuth` (+ kill switches) и `Plugs.PublicApi.RateLimit` (на пользователя,
  отдельный Cachex `:public_api_rate_limit_cache`, бан на час после 30 ответов 404 за 10
  минут). Пайплайн `:public_api_v1`. Контроллеры `PublicApi.V1.{Me,Tournament,Game}Controller`,
  явные сериализаторы `PublicApi.V1.JSON`, строгая валидация тела `PublicApi.V1.Params`
  (лишнее поле → 422), аудит `api_audit_events` + квоты по БД. Секция «API tokens» в настройках
  (`ApiTokensSection.tsx`, эндпоинты `/api/v1/settings/api_tokens`).
- **Отклонение:** вместо `open_api_spex` спека написана руками —
  `priv/openapi/public_api_v1.json`. Она отдаётся на `/public_api/v1/openapi.json`, Swagger UI
  на `/public_api/docs` (CDN unpkg). Нет `CastAndValidate`, `assert_schema` и CI-проверки спеки:
  при изменении API спеку нужно править руками. Если API начнёт расти, стоит перейти на
  `open_api_spex`, как описано в 3.8.
- **Попутный фикс:** `Tournament.Context.update/2` больше не генерирует новый `access_token`
  при каждом редактировании. Раньше любое сохранение формы турнира из UI убивало
  инвайт-ссылку. Теперь существующий токен сохраняется, пока турнир остаётся `token`.
- **Не сделано:** проверка, что Sentry вычищает заголовок `authorization` (3.3). Вынос
  `LobbyChannel.game:create` в общий `Game.Context.create_lobby_game` тоже не сделан: API
  вызывает `Game.Context.create_game` с тем же набором параметров, правило «одна активная игра»
  работает (`Game.Auth`).
- Тесты: `controllers/public_api/public_api_test.exs` (жизненный цикл токена, бан, 401/403,
  bot-игра и `active_game`, турнир: принудительные `token`/`open`, лишнее поле → 422,
  редактирование сохраняет `access_token`, чужой → 404, приватный не в расписании).

**Фаза 4 — сделано, образ не опубликован.**
- `apps/runner/images/dlang/` (alpine + ldc2, `cb_runtime.d` перехватывает stdout, считает
  время и пишет JSON-строки как C++-runtime), шаблон `priv/templates/dlang.eex`,
  `LanguageMeta "dlang"`, compose/k8s/`bin/dev`/Makefile, фронт (иконка `SiD`, подсветка через
  `cpp`, лендинг, счётчик языков → 17).
- Проверено локально на arm64: образ собирается (smoke-тест внутри Containerfile), чекер для
  задачи со всеми типами (вложенные массивы, пустой AA `null`, экранированные строки, float)
  компилируется и проходит; полный прогон контейнера ≈ 0.9 с.
- **Осталось руками:** собрать и опубликовать multi-arch образ, затем выкатить раннер:
  ```sh
  docker buildx build --platform linux/amd64,linux/arm64 \
    -t ghcr.io/hexlet-codebattle/dlang:ldc2 --push apps/runner/images/dlang
  ```
  Под amd64 сборку я не запускал. Пока образ не опубликован, проверка решений на D в проде
  работать не будет: язык появится в списке, но раннера не будет.

**Осталось из фазы 0:** SQL-проверка прода (см. «Что осталось» в фазе 0) и три мелких PR.

---

## Фаза 0. Дыры в существующем `/api/v1` — ✅ сделано (2026-10-09, не закоммичено)

Все дыры сначала воспроизведены временным тестом в dev-контейнере: обычный залогиненный
пользователь, без админских прав. Потом закрыты и покрыты регрессионными тестами. Полный прогон:
runner 185 passed, codebattle 1211 passed; `mix format --check-formatted` и `credo --strict`
по изменённым файлам чистые.

### Что было и что сделано

| # | Дыра | Фикс |
|---|------|------|
| 0.1 | `GET /api/v1/tournaments/:id` отдавал `access_token` приватного турнира (и `players`, `matches`) любому пользователю: структура уходила через `@derive Jason.Encoder` | `Api.V1.TournamentController.show/2`: модератор (`can_moderate?`) получает полную структуру, как раньше (её использует `EditTournament.tsx`). Тот, у кого есть доступ (`Helpers.can_access?/3`: публичный турнир, участник или верный `?access_token=`), получает `public_tournament/1` без `access_token`, `players`, `matches`, `meta`, `cheater_ids`. Остальные получают 404. `index/2` тоже отдаёт `public_tournament/1` (страница расписания использует только `id`, `name`, `grade`, `starts_at`, `state`, `last_round_ended_at`). |
| 0.2 | Mass assignment в `POST`/`PUT /api/v1/tournaments`: `Tournament.changeset/2` кастит почти всё. Обычный пользователь мог выставить `grade: "grand_slam"`, а сезонные очки начисляются за любой завершённый турнир с `grade != 'open'` (`season_result.ex:194`). Так же можно было выставить `event_id`, `use_event_ranking`, `state`, `players`, `task_ids`, `cheater_ids`, `meta` | Новый `Codebattle.Tournament.UserParams.permit/3` (`tournament/user_params.ex`). Админ — без изменений. Остальным — только поля UI-формы (`@user_fields`), всё прочее отбрасывается молча. Для не-админа `meta` при update берётся из текущего турнира: `Context.update/2` пересобирает `meta` из параметров на каждом вызове и иначе затёр бы её. |
| 0.2a | Через `meta` не-админ мог выставить `players_redirect_url` (top200 редиректит выбывших игроков на этот URL), `task_pack_id` (ещё один вход в скрытые пакеты, `round/context.ex:67`), `game_passwords` | `meta` теперь только для админа. UI и раньше показывал поле Meta JSON только админам (`TournamentForm.tsx:753`). Тесты на `meta_json` переведены на админа. |
| 0.3 | Скрытые пакеты задач: провайдер брал пакет по имени без проверки видимости, а имена сезонных пакетов предсказуемы (`grand_slam_s#{n}_#{year}`) — можно было заранее прорешать Grand Slam | `UserParams`: для не-админа `task_pack_name` должен быть в `TaskPack.filter_visibility/2` (публичный и активный или свой), иначе 422 `{errors: {task_pack_name: ["is not available"]}}`. Неизменённое значение при update разрешено, чтобы модератор турнира, созданного админом, мог его редактировать. |
| 0.4 | `POST /games/create_by_task` делал `Task.get!/1` без проверки видимости, и скрытые задачи перебирались по id | `GameController.create_by_task/2`: `Task.get_task_by_id_for_user/2` (как в лобби), невидимая задача или кривой id → 404. |
| 0.5 | `POST /api/v1/user/:id/send_premium_request` голосовал за любого `:id`; `GET /api/v1/user/premium_requests` отдавал все заявки всем | Гость → 401, чужой `:id` → 403. Список заявок — только админу (фронт его не использует). |
| 0.6 | `game_passwords` из `meta` уходили всем участникам: в join игрового канала (`game_channel.ex:96`) и во всех payload турнира через `Helpers.prepare_to_json/1` — блокировка игр паролем не работала | `Helpers.public_meta/1` убирает `game_passwords`; используется в `prepare_to_json/1` и в join игрового канала. Фронт `gamePasswords` не читает. Модератор по-прежнему видит пароли в форме редактирования (полная структура из `show`). |

Файлы: `tournament/user_params.ex` (новый), `controllers/api/v1/tournament_controller.ex`,
`controllers/game_controller.ex`, `controllers/api/v1/user_controller.ex`,
`tournament/helpers.ex`, `channels/game_channel.ex` + тесты в
`api/v1/tournament_controller_test.exs`, `game_controller_test.exs`,
`api/v1/user_controller_test.exs`, `tournament/helper_test.exs`.

Изменения поведения, о которых стоит знать:
- Не-админ больше не может задать `meta` через API (через UI и раньше не мог).
- Лишние поля от не-админа отбрасываются молча, а не дают ошибку, чтобы не сломать форму: она
  шлёт `meta_json`, `tags`, `tournament_id`.
- `Context.create/1` → `{:error, :draining}` раньше падал с `CaseClauseError` (500), теперь 422
  `{errors: {base: ["draining"]}}`.

### Что осталось (не код, а проверка или отдельные решения)

1. **Проверить прод на уже случившиеся злоупотребления** и, если найдётся, почистить и
   пересчитать сезон (`SeasonResult.aggregate_season_results/1`):
   ```sql
   -- сезонные турниры генерируются с creator_id = NULL (season_tournament_generator.ex:26)
   SELECT t.id, t.name, t.grade, t.event_id, t.task_pack_name, t.meta, t.creator_id, u.name, t.state, t.started_at
   FROM tournaments t
   JOIN users u ON u.id = t.creator_id
   WHERE u.subscription_type NOT IN ('admin', 'moderator')
     AND (t.grade <> 'open' OR t.event_id IS NOT NULL OR t.meta ? 'players_redirect_url'
          OR t.meta ? 'task_pack_id'
          OR t.task_pack_name IN (SELECT name FROM task_packs WHERE visibility = 'hidden'))
   ORDER BY t.id DESC;

   -- игры по скрытым задачам, созданные не их авторами через create_by_task (бот + hidden-игра)
   SELECT g.id, g.task_id, g.inserted_at, g.player_ids
   FROM games g
   JOIN tasks t ON t.id = g.task_id
   WHERE t.visibility = 'hidden' AND g.tournament_id IS NULL AND g.visibility_type = 'hidden'
     AND NOT (t.creator_id = ANY (g.player_ids))
   ORDER BY g.id DESC;
   ```
   Если `create_by_task` по скрытым задачам находится — считать задачи этих пакетов
   скомпрометированными и заменить их в будущих сезонных пакетах.
2. **`task_ids` в join игрового канала и в `prepare_to_json`** — это полный список задач
   турнира на все раунды (`maybe_set_task_ids`, `strategy/base.ex:689`). После 0.3 и 0.4
   скрытые задачи по id не открыть, а порядок задач публичного пакета и так публичен, поэтому
   риск низкий. Правильнее отдавать фронту `tasks_count` (фронт использует только
   `taskIds.length`: `useTournamentStats.ts:48`, `TournamentRankingTable.tsx:69`). Отдельный
   маленький PR.
3. **Несуществующие роуты**, которые зовёт фронт: `GET /api/v1/tournaments/:id/players`
   (`middlewares/Tournament.ts:258`, `TournamentAdmin.ts:209`) и `/matches`
   (`TournamentAdmin.ts:263`). Для не-live турниров игроки не подгружаются. Баг, не security.
4. `POST /api/v1/tournaments` не требует логина: гость (если выключен `restrict_guests_access`)
   доходит до `Context.create`. Стоит закрыть `RequireAuth` на `create`/`update` при следующем
   заходе в этот контроллер.

---

## Фаза 0b. Исключённый игрок держал раунд — ✅ сделано (2026-10-09, не закоммичено)

**Симптом** (сообщили организаторы): игрок не закончил раунд, его исключили из турнира, он был
последним, кого ждали, — а следующий раунд не начинается.

**Причина** (воспроизведено тестом на swiss из 4 игроков: и для кика, и для бана матч и игра
остались `playing`, раунд — `active`):
- Раунд завершается только из обработчика `game:tournament:finished`
  (`Tournament.Server.maybe_finish_live_match/4` → `should_schedule_round_finish?/1`).
- Исключение — это `:leave` (кик из админки, `tournament:player:kick`) или
  `:toggle_cheater_player` (бан). Оба идут через общий `handle_call({:fire_event, ...})`,
  который раунд не перепроверяет и живую игру исключённого не трогает. Раунд ждёт, пока игра
  сама дойдёт до таймаута задачи. С ботом-соперником (нечётное число игроков) это почти всё
  время задачи.
- То же с админской кнопкой «закрыть матч» (`:game_over_match`): матч становится `game_over`,
  но раунд не перепроверяется, а пришедший позже `game:tournament:finished` для уже не-`playing`
  матча игнорируется. Раунд висел до таймера раунда или ручного «Finish round».
- Отдельная дыра рядом: бан в игре был только на фронте (блокировка редактора). Сервер в
  `Engine.check_result` `is_banned` не проверял, а кик вообще не помечал игрока в игре.
  Исключённый мог отправить решение через websocket, выиграть, и его сопернику засчитывалось
  поражение.

**Что сделано:**
- `Tournament.Base.release_excluded_player_match/2` (`strategy/base.ex`), вызывается из
  `leave/2` и `ban_player/3`, только для `state: "active"`. Находит живой матч исключённого
  (`get_matches(tournament, "playing")` по `player_ids`; при кике игрок уже удалён из таблицы
  игроков, поэтому не через `get_player_latest_match`):
  - **в матче не осталось реальных игроков** (соперник — бот или тоже исключён/забанен) →
    `Game.Context.trigger_timeout/1`. Игра заканчивается таймаутом, дальше обычный путь
    `game:tournament:finished` → матч закрыт → раунд завершается;
  - **остался реальный соперник** → игра продолжается для него, исключённый помечается
    `is_banned` в игре (идемпотентно). Раунд честно ждёт соперника: он ещё может решить и
    выиграть. Если ждать не хочется — у админа есть «Finish round».
  - Почему таймаут, а не техническая победа соперника: у победителя duration игры входит в
    `PERCENTILE_CONT(0.25)` базового балла задачи (`tournament_result.ex`). Победа за 5 секунд
    по неявке сдвинула бы баллы всем в раунде. `timeout`-игры в базу не входят. Это та же
    семантика, что у окончания раунда по таймеру (`finish_all_playing_matches`).
- `Tournament.Server`: после `:leave`, `:toggle_ban_player`, `:toggle_cheater_player`,
  `:game_over_match` (`@round_closing_events`) раунд перепроверяется:
  `maybe_schedule_round_finish_after/2`. Только для `active`, не ladder (у ladder свой drain),
  не в перерыве и только если в текущем раунде есть матчи (пустой раунд `Enum.all?([])` иначе
  «завершился» бы).
- `Engine.check_result/2`: игрок с `is_banned` в игре → `{:error, :banned}`.

**Тесты** (`tournament/swiss_test.exs`, describe "excluding a player in the middle of a
round"): кик и бан последнего реального игрока в матче с ботом → раунд 1; кик при живом
сопернике → раунд ждёт, исключённый забанен в игре и получает `{:error, :banned}`, после
окончания игры соперника → раунд 1; «закрыть матч» руками → раунд 1. Без фикса все 4 теста
падают. Полный прогон: runner 185, codebattle 1215 passed; format и credo чистые.

**Известное ограничение — top200:** если игрока кикнули между первой и второй игрой пары, то
`start_rematch` создаёт игру только с оставшимся игроком (`get_players` отбрасывает `nil`).
Это одиночная игра в `waiting_opponent` без таймера игры, а правило «каждая пара сыграла 2
игры» для этой пары не выполнится. Раунд закончится по таймеру раунда, то есть навсегда не
зависнет. При бане такого нет: забаненный остаётся в таблице игроков, реванш создаётся на
двоих, и забаненный не может выиграть. Если кики в top200 станут реальностью, в
`start_rematch` для пары с выбывшим нужно сразу закрывать матч, не создавая игру.

---

## Фаза 1. Ссылки в списке онлайна (Playing / Watching / Tournament)

**Как сейчас.**
- Presence-meta уже содержит `path` (`main_channel.ex:14`, `:157`, `:108`). Его присылает
  клиент на join (`Main.ts` → `path: document.location.pathname`).
- `getMajorState` (`assets/js/widgets/middlewares/Main.ts:30`) оставляет только `state` и
  выкидывает `path`.
- Баг: пользователи на странице турнира имеют state `tournament`, но
  `ChatGroupedPlayersList` (`pages/lobby/LobbyChat.tsx:65`) такую группу не рендерит. Они есть в
  счётчике «Online players: N», но не в списке.

**Бэкенд (`main_channel.ex`).**
- На join вычислить санитизированное поле `link` и класть его в meta рядом с `path`. `path` не
  трогаем: им пользуется `AdminWidget.tsx:437`.
  - `~r{^/games/(\d+)/?$}` → `"/games/:id"`, только если игра не `visibility_type: "hidden"`
    и не включён флаг `user_only_see_own_games` (см. `GameController.can_access_game?/2`).
    Lookup один раз на join через `Game.Context.fetch_game/1`.
  - `~r{^/tournaments/(\d+)/?$}` → `"/tournaments/:id"`.
  - Всё остальное → `nil`.
- То же поле в `handle_in("change_presence_state", ...)` (строка 108) и `{:after_join, state}`
  (строка 155). Вынести сборку meta в одну приватную функцию `presence_meta/2`.

**Фронт.**
- `Main.ts`: `getMajorState` → `getMajorMeta(metas)`, возвращает meta с максимальным весом.
  В `syncPresence` проставлять `currentState` и `currentLink`.
- `LobbyChat.tsx`:
  - `ChatPlayer` += `currentLink?: string`.
  - `UsersList` рядом с `ChatUserInfo` рендерит иконку-ссылку (`faEye` для watching,
    `faGamepad` для playing, `faTrophy` для tournament). Перед рендером ещё раз проверять
    `^/(games|tournaments)/\d+$`.
  - Добавить группу `tournament` («In tournament»).
- i18n: новые строки (`In tournament`, `Open game`, `Open tournament`) руками добавить в
  `priv/gettext/ru/LC_MESSAGES/default.po`, потому что `gettext.extract` не видит JS.

**Тесты.**
- `main_channel_test.exs`: `link` есть для публичной игры и турнира, `nil` для hidden-игры и
  мусорного path.
- Vitest: `getMajorMeta` и группировка в `LobbyChat` (группа tournament рендерится).

---

## Фаза 2. Проверка решения после таймаута

**Правило:** проверить решение после таймаута можно, пока жив процесс игры. Если процесс умер,
нельзя. На результат игры, турнира и рейтинг такая проверка не влияет.

**Как сейчас.**
- После таймаута процесс игры уже живёт ещё минуту. `Engine.maybe_finalize_timeout/3` вызывает
  `terminate_game_after(game, timeout_termination_delay(game))` (`game/engine.ex:537-545`).
  Единица — **минуты**: `TimeoutServer.terminate_after/2` → `to_timeout(minute: ...)`. Для
  турнирных игр это 1 минута, для остальных 15. Окно уже есть, его надо только назвать явно.
- Конец раунда идёт тем же путём: `finish_all_playing_matches/1` → `Game.Context.trigger_timeout/1`
  (`tournament/strategy/base.ex:1276`).
- «Жив ли процесс» уже проверяется: `Game.Context.check_result/2` (`game/context.ex:270`)
  пропускает только `is_live: true`, иначе `{:error, :game_is_dead}`.
- Блокер на бэке: `Engine.check_result(%Game{state: "timeout"}, _)` → `{:error, :game_timeout}`
  (`engine.ex:216`).
- Блокер на фронте: `canCheckSolution` (`pages/game/EditorContainer.tsx:200`) разрешает только
  active или `game_over`. Редактор после таймаута не блокируется.

**Почему нельзя просто прогнать обычный `do_check_result`.**
- Турнирные очки считаются SQL-ем по `games.players[].result_percent`
  (`tournament/tournament_result.ex:92`). Если FSM обновит `check_result` или `result_percent`
  игрока и это попадёт в БД, очки поплывут.
- `game:check_started` и `game:check_completed` уходят в глобальный PubSub: их слушают
  `lobby_channel` и `tournament_streamer_channel`. Стрим покажет проверку после таймаута как
  настоящую.
- Playbook сохраняется асинхронно в момент таймаута (`store_playbook_async`). Записи, которые
  попадут туда позже, создадут гонку.

**Бэкенд.**
1. `Engine`:
   ```elixir
   def check_result(%Game{state: "timeout"} = game, params), do: post_timeout_check(game, params)
   ```
   `post_timeout_check/2`:
   - проверяет, что пользователь — игрок (`Game.Helpers.player?/2`), иначе
     `{:error, :not_a_player}`; бан проверять так же, как уже делает общая ветка
     `check_result/2` после фазы 0b (`banned_player?/2` → `{:error, :banned}`);
   - выключается флагом `FunWithFlags` `:post_timeout_check_disabled`: на тяжёлых ивентах 200
     человек жмут «Проверить» в ту же минуту, когда стартует следующий раунд;
   - вызывает `CodeCheck.check_solution(task, text, lang, %{user_id, game_id, tournament_id, post_timeout: true})`;
   - **не** вызывает `fire_transition`, `update_playbook`, `PubSub.broadcast`;
   - возвращает `{:ok, game, %{check_result: r, solution_status: false, post_timeout: true}}`.
2. `CodeCheck.Run` / `RunLogger`: post-timeout запуски логируются как обычно, без новых
   колонок. Процесс жив, значит запуск легитимный. Единственный читатель `code_check_runs` —
   админский мониторинг нагрузки раннеров (`live/admin/code_check/index_view.ex`), а для него
   это такая же нагрузка.
3. `GameChannel.handle_in("check_result", ...)` (`game_channel.ex:261`):
   - `broadcast_from!("user:start_check")` уходит до проверки, поэтому завершение тоже
     обязательно рассылать всем в топике игры, иначе у соперника и зрителей зависнет спиннер.
   - `broadcast!(socket, "user:check_complete", %{..., post_timeout: true})`, только в топике
     игры, не в глобальном PubSub. `players` и `state` в payload — без изменений.
4. Явное имя окна: `@tournament_post_timeout_minutes 1`, `@default_post_timeout_minutes 15`
   вместо `timeout_termination_delay/1`. В `GameView.render_game/2` отдавать
   `post_timeout_check_until` (`finishes_at` + окно), если `state == "timeout"` и `is_live`.
5. Граница `timeout_expired?` → `trigger_timeout` в `check_result/2` (`engine.ex:218`) пока
   оставить с ошибкой `:game_timeout`. Если захочется сразу запускать post-timeout проверку,
   не вызывать `check_result/2` рекурсивно: после `trigger_timeout` игра может быть
   `game_over`, и снова сработает `timeout_expired?`.

**Фронт.**
- `EditorContainer.tsx:200`: `canCheckSolution` += `isGameOver && gameState === GameStateCodes.timeout`,
  пока `now < postTimeoutCheckUntil`.
- `Room.ts` `checkGameSolution`: добавить `.receive('error', ...)`. На `game_is_dead`
  показывать «Время на дорешивание вышло», сбрасывать checking-статус и дизейблить кнопку.
- `handleNewCheckResult` (`Room.ts:490`): при `post_timeout: true` показывать в выводе
  плашку «Проверка после окончания — на результат не влияет».
- Соперник и зрители (nice-to-have, если окажется тяжело — пропустить): на `user:check_complete`
  с `post_timeout: true` у игрока показывать бейдж «после времени: N%» (или «решил после
  времени», если `status == "ok"`). Хранить только во фронтовом стейте игры (Redux), в
  `players` на бэке не писать. Зрительский обработчик — `machines/spectator.ts` /
  `Room.ts:454`.
- Счётчик «можно проверить ещё N сек» рядом с кнопкой (опционально).
- Учесть: при `auto_redirect_to_game` игрока унесёт в игру следующего раунда. Реальное окно —
  минимум из «1 минута» и «до старта следующего раунда». Вернуться во вкладку старой игры можно,
  пока жив процесс.

**Тесты (`game/context_test.exs`, `game_channel_test.exs`, турнирный интеграционный).**
- Timeout-игра с живым процессом: проверка выполняется, `state` и `players` не меняются,
  в БД `players[].result_percent` не меняется.
- После terminate: `{:error, :game_is_dead}`.
- Не-игрок и забаненный получают ошибку.
- Swiss-турнир: успешная post-timeout проверка не меняет ranking и `tournament_result`.
- Нет сообщений `game:check_completed` в глобальном PubSub. В топике игры приходит
  `user:check_complete` с `post_timeout: true`.
- Запуск записан в `code_check_runs`.

---

## Фаза 3. Public API v1: узкое, «вокруг меня», с токенами и скоупами

Зависит от фазы 0: API вызывает те же контексты, поэтому сначала закрываем дыры там.

### 3.1 Модель угроз

Что API не должно позволять, даже владельцу валидного токена:

1. **Перебрать пользователей и их данные.** id у пользователей, игр, турниров и задач
   последовательные. Любой эндпоинт вида `GET /users/:id` или `GET /games/:id` для чужих
   объектов превращается в скрейпер базы.
2. **Утащить задачи и тесты.** Скрытые задачи и турнирные пакеты — это честность
   соревнований (см. 0.3, 0.4).
3. **Читерить.** Автоматически отправлять решения, подглядывать код соперника во время игры.
4. **Влиять на рейтинги, сезоны и ивенты** через создаваемые турниры и игры (см. 0.2).
5. **Спамить** турнирами и играми, грузить раннеры, засорять лобби и расписание.
6. **Нанести большой ущерб при утечке токена.** Токены лежат на устройствах, в CLI, в ботах.

### 3.2 Принципы

- **Allowlist.** Существуют только перечисленные эндпоинты и поля. Всего остального в API нет.
- **Всё «вокруг меня».** Каждый эндпоинт отдаёт либо данные владельца токена, либо объекты, с
  которыми он связан (свои игры; турниры, где он создатель, модератор или участник). Нет ни
  одного эндпоинта, который принимает чужой `user_id`, и нет ни одного списка пользователей.
- **Чужое = 404, а не 403.** Нельзя отличить «нет такого» от «нет доступа», поэтому перебор id
  ничего не даёт.
- **Токен обязателен везде.** Анонимного доступа к v1 нет, кроме `openapi.json` и legacy
  `events/:id/leaderboard`. Скрейпинг без аккаунта исключён. Лимиты считаются только по
  пользователю — владельцу токена; IP-лимитов в v1 нет.
- **API ≤ UI.** Через API можно сделать только подмножество того, что пользователь может в UI,
  тем же доменным кодом и с более жёсткими лимитами.
- **Никакого кода.** API не принимает и не отдаёт решения, `editor_text`, `check_result`,
  тесты задач.
- **Ничего, что влияет на рейтинги, сезоны и ивенты.** Турниры из API всегда `grade: "open"`,
  без ивентов, пакетов и `task_ids`. Игры только по уровню.
- **Минимум привилегий.** Скоупы на токен, запись включается явно. Токен не может управлять
  токенами и настройками аккаунта.

### 3.3 Токены и скоупы

**Скоупы:**

| Скоуп | Что даёт | По умолчанию |
|---|---|---|
| `read` | `/me*`, связанные турниры, расписание | да |
| `games:write` | создать и отменить свою игру | нет |
| `tournaments:write` | создать, изменить, стартовать и отменить свой турнир | нет |

**Кто может выпустить токен со скоупами записи:** не гость, не `banned`, не архивирован,
аккаунт старше N дней (конфиг, старт: 7). Админам и модераторам можно всегда. `read` — любому
залогиненному.

**Модель** — по образцу `Codebattle.UserSession` (`user_session.ex`): в БД только SHA-256,
токен показывается один раз.

Миграция `create_user_api_tokens`:
```elixir
create table(:user_api_tokens, primary_key: false) do
  add :id, :binary_id, primary_key: true
  add :user_id, references(:users, on_delete: :delete_all), null: false
  add :name, :string, null: false                  # "Gauntlet", "my bot"
  add :token_hash, :binary, null: false
  add :token_prefix, :string, null: false          # "cbp_a1b2c3d4" — для UI
  add :scopes, {:array, :string}, null: false, default: ["read"]
  add :last_used_at, :utc_datetime
  add :expires_at, :utc_datetime                   # nil = бессрочный
  add :revoked_at, :utc_datetime
  timestamps()
end
create unique_index(:user_api_tokens, [:token_hash])
create index(:user_api_tokens, [:user_id])
```

`Codebattle.UserApiToken`:
- `create(user, %{name, scopes, expires_in_days})` → `{:ok, record, raw_token}`. Проверяет
  право на скоупы. Формат токена:
  `"cbp_" <> Base.url_encode64(:crypto.strong_rand_bytes(32), padding: false)`.
- `get_active_by_token(raw)`: join `users` (`archived_at IS NULL`,
  `subscription_type <> 'banned'`), `revoked_at IS NULL`, не истёк. Бан или архивация
  выключают токены сразу, на следующем же запросе. `touch/2` с троттлингом 5 минут.
- `list_active/1`, `revoke_for_user/2`, `revoke_all/1`. Не больше 10 активных токенов на
  пользователя. Срок жизни: 30 / 90 / 365 дней / бессрочно (только `read`); по умолчанию 90.
- `revoke_all/1` вызывается при смене пароля (`User.update_password`, рядом с
  `UserSession.revoke_all`, `user.ex:496`) и архивации (`User.archive/1`).

**Аутентификация:**
```
Authorization: Bearer cbp_...
        │
:public_api_v1   accepts json
                 ApiTokenAuth      — нет/плохой/просроченный → 401 + WWW-Authenticate: Bearer
                 ApiKillSwitch     — флаги :public_api_disabled / :public_api_writes_disabled → 503
                 ApiRateLimit      — ключ public_api:<bucket>:<user_id> (общий на все токены
                                     пользователя, IP не учитываем)
                 PutApiSpec + CastAndValidate (OpenApiSpex)
        │
контроллер:      RequireScope "read" | "games:write" | "tournaments:write" → 403 insufficient_scope
```
- **Новый пайплайн `:public_api_v1`**, существующий `:public_api` не трогаем: на нём
  `POST /api/v1/group_task_solutions` (`router.ex:350`) со своими Bearer-токенами групповых
  турниров (`group_task_solution_controller.ex:18`).
- Токен принимается только из заголовка (не из query: логи, Referer).
- Cookie в `/public_api` не читаются, CSRF не нужен. CORS не настраиваем: клиенты — CLI и боты.
- PAT не работает в `/api/v1`, в браузерных роутах и в `UserSocket`. Управление токенами и
  настройками — только через cookie-сессию.
- Проверить, что Sentry вычищает заголовок `authorization` из событий.

**UI в профиле** (`pages/settings/UserSettings.tsx`, под «Active devices», по образцу сессий):
список (имя, `cbp_a1b2…`, скоупы, создан, последнее использование, истекает), форма создания
(имя, чекбоксы скоупов — write-скоупы недоступны, если нет права; срок), модалка «токен
показывается один раз» с кнопкой копирования, отзыв. Данные — inertia-проп `api_tokens` на
`/settings`. Мутации — во внутреннем API (cookie + CSRF), рядом с сессиями в
`SettingsController`: `POST /api/v1/settings/api_tokens`, `DELETE /api/v1/settings/api_tokens/:id`.
RU-строки руками в `ru/default.po`.

### 3.4 Эндпоинты v1

Всё под `/public_api/v1`, всё требует токен.

**Чтение (`read`)**

| Метод | Путь | Что отдаёт | Доступ |
|---|---|---|---|
| GET | `/me` | `{id, name, avatar_url, rating, rank, lang}` | свои данные |
| GET | `/me/active_game` | текущая игра или `null` + `server_time` | своя |
| GET | `/me/games?cursor=` | свои завершённые игры, курсор, ≤ 50 на страницу | свои |
| GET | `/me/tournaments?state=` | турниры, где я создатель, модератор или участник | связанные |
| GET | `/tournaments/schedule` | публичные `upcoming`/`active` турниры на 14 дней вперёд, без игроков | публичное, ограничено окном |
| GET | `/tournaments/:id` | карточка турнира | связанный, или публичный в окне расписания |
| GET | `/tournaments/:id/ranking` | создатель/модератор — весь рейтинг с пагинацией; участник — топ-20 + своя строка | только связанный |

**Запись (`games:write`)**

| Метод | Путь | Что делает |
|---|---|---|
| POST | `/games` | создать игру: `{level, opponent: "bot" \| "link", timeout_seconds}` |
| POST | `/games/:id/cancel` | отменить свою игру в `waiting_opponent` |

- `level` ∈ `elementary|easy|medium|hard`, задача случайная по уровню. `task_id` в v1 не
  принимаем: это оракул существования задач, и без него хватает.
- `timeout_seconds` ∈ 60..3600.
- `opponent: "bot"` — игра с ботом (как в лобби). `opponent: "link"` — `hidden`-игра в
  `waiting_opponent`, в ответе `join_url`; соперник заходит по ссылке в браузере. Перед
  реализацией проверить, что hidden-игру можно открыть и присоединиться к ней по прямой ссылке.
- Приглашений по `user_id` нет: это требует поиска пользователей и даёт канал спама.
- Код: вынести логику `LobbyChannel.handle_in("game:create")` (`lobby_channel.ex:33`) в
  `Game.Context.create_lobby_game(user, opts)` и вызывать из лобби и API. Правило «одна
  активная игра на пользователя» (`:already_in_a_game`) наследуется само.
- Ответ: `{game: {id, url, join_url, state}}`. Играет пользователь в браузере.

**Запись (`tournaments:write`)**

| Метод | Путь | Что делает |
|---|---|---|
| POST | `/tournaments` | создать приватный турнир |
| PATCH | `/tournaments/:id` | изменить свой турнир до старта |
| POST | `/tournaments/:id/start` | стартовать свой турнир |
| POST | `/tournaments/:id/cancel` | отменить свой турнир |

Входные поля (всё остальное → 422, `additionalProperties: false`):

| Поле | Ограничение |
|---|---|
| `name` | 3..100 |
| `description` | 3..2000 |
| `starts_at` | ISO 8601, в будущем, не дальше 30 дней |
| `type` | `swiss` |
| `level` | `elementary\|easy\|medium\|hard` |
| `players_limit` | 2..64 |
| `rounds_limit` | 1..10 |
| `timeout_mode` | `per_task\|per_round_fixed` |
| `match_timeout_seconds` / `round_timeout_seconds` | 60..3600 |
| `break_duration_seconds` | 0..600 |
| `use_chat` | bool |

Принудительно сервером: `access_type: "token"` (турнир всегда приватный, в публичное
расписание не попадает), `grade: "open"`, `task_provider: "level"`, без `event_id`,
`task_pack_name`, `task_ids`, `meta`, `moderator_ids` (id других пользователей не
принимаем). Параметры собираются **с нуля** из провалидированного тела (модуль
`PublicApi.TournamentParams`), а не мержем пользовательской мапы. Дальше
`Tournament.UserParams.permit/3` из фазы 0 как вторая линия защиты, затем
`Tournament.Context.create/1`.

Ответ создателю: карточка турнира + `access_token` + `invite_url`
(`/tournaments/:id?access_token=...`). Участники присоединяются в браузере. `start` и
`cancel` идут через существующие `Tournament.Context.handle_event/3` с `user` — там уже
проверяется `can_moderate?`. Дополнительно в API: только создатель.

**Чего в v1 нет и не будет без отдельного решения:** пользователи по id и любые списки
пользователей, рейтинг, чужие игры, задачи, playbook, код и проверка решений, чат, кланы,
вступление в турниры, кик и бан, назначение модераторов, публичные турниры.

### 3.5 Что отдаём в ответах

Явные сериализаторы `CodebattleWeb.PublicApi.V1.*JSON`, никакого `Jason.Encoder` схем.

- **Пользователь (любой, кроме `/me`):** только `{id, name, avatar_url, rating, lang}` и
  только внутри связанного объекта (соперник в своей игре, строка рейтинга своего турнира).
  Никогда: email, `github_*`, `discord_*`, `external_oauth_id`, `subscription_type`,
  настройки, клан, таймзона.
- **Игра:** `id, url, state, level, type, starts_at, timeout_seconds, ends_at, finishes_at,
  result, tournament{id,name,round_position}, task{id,name,level}, players[...]`. Никогда:
  `editor_text`, `check_result`, `result_percent` соперника в live-игре, описание задачи и
  тесты.
- **Турнир:** `id, name, url, type, state, level, grade, access_type, starts_at, started_at,
  players_count, players_limit, rounds_limit, current_round{position, started_at, ends_at},
  break{active, ends_at}`. `grade` — только для чтения (в расписании это публичная информация;
  у турниров из API всегда `open`). `access_token` и `invite_url` — только создателю и
  модераторам. Никогда: `players`, `matches`, `cheater_ids`, `meta`, `event_id`.
- Формат: ключ верхнего уровня по ресурсу, как в `/api/v1` (`{"tournament": ...}`).
  Пагинация курсором (`?cursor=`, ответ `next_cursor`), без `total_entries` (не раскрываем
  объёмы). Время в ISO 8601 UTC с `Z`, `NaiveDateTime` конвертировать явно. В ответах с
  дедлайнами — `server_time`.
- Ошибки: `{"error": {"code": "...", "message": "..."}}`. Коды: `unauthorized`,
  `invalid_token`, `insufficient_scope`, `not_found`, `validation_failed`, `quota_exceeded`,
  `rate_limited`, `api_disabled`.
- В v1 только аддитивные изменения, ломающие — в v2.

### 3.6 Лимиты и квоты

Всё считается **на пользователя — владельца токена** (общий счётчик для всех его токенов,
иначе 10 токенов = 10× лимит). IP не учитываем вообще. Реализация — плаг `ApiRateLimit` после
`ApiTokenAuth`, ключ `public_api:<bucket>:<user_id>` из `conn.assigns.current_user`, fixed
window на Cachex по образцу `CodebattleWeb.Plugs.RateLimit` (отдельный Cachex-инстанс,
fail-open). Значения стартовые, вынести в конфиг.

| Что | Лимит |
|---|---|
| Все запросы | 60/мин |
| `POST /games` | 5/мин, 30/сутки |
| `POST /tournaments` | 5/сутки |
| Активных (`upcoming`/`waiting`/`active`) турниров, созданных через API | ≤ 3 |
| Ответов 404 | > 30 за 10 мин → токен в бан на 1 час (детектор перебора) |

Ответ 429 с `Retry-After` и заголовками `X-RateLimit-*`. Квоты на создание проверяются в
транзакции по БД (счётчик созданных объектов из аудита), а не только в Cachex: Cachex живёт на
ноде и сбрасывается при деплое.

**Kill switches:** `FunWithFlags` `:public_api_disabled` (весь v1 → 503) и
`:public_api_writes_disabled` (только запись).

### 3.7 Аудит

Таблица `api_audit_events`: `user_id, api_token_id, action ("game.create", "tournament.create",
"tournament.update", "tournament.start", "tournament.cancel", "game.cancel"), resource_type,
resource_id, inserted_at`. Зачем:
- модерация («кто наспамил»);
- квоты на создание (3.6);
- админская кнопка «отозвать токен и отменить всё, что он создал и что ещё не началось».

Чтения не аудируем, достаточно `last_used_at` и метрик.

### 3.8 OpenAPI

- `{:open_api_spex, "~> 3.x"}` (актуальная версия на момент внедрения).
- `CodebattleWeb.PublicApi.ApiSpec`: `securitySchemes: bearerAuth`, у каждой операции
  указаны скоупы.
- Схемы в `CodebattleWeb.PublicApi.Schemas.*`. У request-схем `additionalProperties: false`;
  `CastAndValidate` отвечает 422 на лишние поля, а не молча игнорирует их.
- `GET /public_api/v1/openapi.json` и Swagger UI на `/public_api/docs`.
- Спека коммитится в `apps/codebattle/priv/openapi/public_api_v1.json`. В CI регенерация +
  `git diff --exit-code`: любое расширение API видно в PR.

### 3.9 Тесты

- **Матрица доступа** (одна таблица-тест): эндпоинт × {без токена, `read`, `games:write`,
  `tournaments:write`, токен забаненного, токен архивированного, отозванный, просроченный} →
  ожидаемый статус.
- **Чужое = 404:** чужая игра, чужой приватный турнир, публичный турнир вне окна расписания,
  несуществующий id — одинаковый ответ.
- **Сканер запрещённых ключей:** рекурсивный обход JSON всех ответов; падаем, если
  встречаются `email`, `access_token` (кроме создателя), `editor_text`, `check_result`,
  `asserts`, `solution*`, `token_hash`, `subscription_type`, `meta`, `players` (мапа
  турнира), `matches`, `cheater_ids`.
- **Запись:** лишние поля → 422; `grade`/`event_id`/`task_pack_name`/`task_ids` в теле → 422;
  созданный турнир всегда `token` и `open`; квоты и активные лимиты; только создатель может
  `PATCH`/`start`/`cancel`; `opponent: "link"` создаёт `hidden`-игру.
- **Токены:** сырой токен возвращается один раз, в БД только хеш; `revoke_all` при смене
  пароля и архивации; write-скоупы не выдаются без права; лимит 10 токенов.
- Детектор перебора: после 30 404 токен получает 429.
- `assert_schema` (OpenApiSpex) на каждый ответ.
- `group_task_solutions` с групповым Bearer-токеном не сломан.

### 3.10 Порядок

1. Фаза 0 — сделано.
2. Токены (модель, плаг, скоупы, UI), лимиты, kill switches, `/me`, `/me/active_game`.
   Этого уже хватит гантлету.
3. Остальное чтение.
4. `games:write` вместе с квотами и аудитом.
5. `tournaments:write` вместе с квотами и аудитом.
6. OpenAPI, Swagger UI, CI-проверка спеки (схемы пишутся по ходу, здесь — публикация и CI).

### 3.11 Потом (не v1, каждое — отдельное решение)

- Realtime: SSE `/public_api/v1/me/events` вместо поллинга.
- Вступление в турнир через API (`POST /tournaments/:id/join` для себя).
- Создание игр по своим задачам (`task_id`, где `creator_id == me`).
- OAuth2 для сторонних приложений.

---

## Фаза 4. Язык D

**Компилятор: ldc2 на обеих архитектурах.** Прод на x86_64, но все образы обязаны собираться
под amd64 и arm64. dmd под arm64 не существует. Ставить dmd на amd64 и ldc на arm64 в один
образ — это два тулчейна с разными версиями и поведением, и баги «у меня локально работает»
гарантированы. ldc2 использует тот же фронтенд, что и dmd, поэтому код, написанный «под dmd»,
компилируется без изменений. Компилировать с `-O0`, runtime собрать заранее (см. ниже), чтобы
время компиляции было сопоставимо с dmd. Версию ldc зафиксировать в `Containerfile` и в
`LanguageMeta.version`. Проверить сборку образа под обе платформы
(`docker buildx build --platform linux/amd64,linux/arm64`).

**Slug:** `dlang` (`d` слишком короткий для grep, конфигов и URL), имя `D`.

**Типы** (`apps/runner/lib/runner/languages.ex`, статический `checker_meta` как у cpp/zig):

| codebattle | D | default |
|---|---|---|
| integer | `long` | `0` |
| float | `double` | `0.1` |
| string | `string` | `"value"` |
| array | `<%= inner_type %>[]` | `[<%= value %>]` |
| boolean | `bool` | `false` |
| hash | `<%= inner_type %>[string]` | `["key": <%= value %>]` |

Шаблон решения:
```d
import std;

<%= expected %> solution(<%= arguments %>) {
    <%= expected %> ans = <%= default_value %>;
    return ans;
}
// <%= comment %>
```

**Что добавить** (по образцу zig/cpp):
- `apps/runner/images/dlang/`: `Containerfile` (alpine + ldc, non-root `app:10001`, бинарь
  раннера), `Makefile` (`test` = сборка `check/checker.d` + запуск), `check/checker.d`,
  `check/solution.d`, `runtime.d`.
  - `runtime.d` — аналог `images/cpp/runtime.cpp`: перехват stdout, замер времени и JSON-строки
    `{"type":"result","value":...,"output":"...","time":"0.0000123"}` /
    `{"type":"error",...}` (`output_version: 2`). Собрать в объектник при сборке образа, как
    cpp собирает `/pch/runtime.o`, чтобы не компилировать Phobos-шаблоны на каждую проверку.
    Цель — время компиляции не хуже cpp.
- `apps/runner/priv/templates/dlang.eex` — генерация `checker.d` (по образцу `cpp.eex`).
- `languages.ex`: `"dlang"` в список языков (строка ~22) и `LanguageMeta`.
- Тесты: `apps/runner/test/runner/solution_generator_type_tests/dlang_type_test.exs` +
  `all_languages_type_test.exs` + `solution_generator_test.exs`.
- Инфраструктура: `compose.yml` (`runner-dlang`, profile), `bin/dev:40` (whitelist
  `CODEBATTLE_DEV_RUNNER_LANGS`), `Makefile` (`runner-dlang`).
- Фронт: `config/languages.ts`, `config/langIconNames.ts`, `config/languageTabSizes.ts`,
  `config/langToSpacesMapping.ts`, `components/LanguageIcon.tsx` + SVG-иконка,
  `staticAssets.ts`, `pages/lobby/CodebattleLeagueDescription.tsx`, лендинг
  (`templates/root/landing.html.heex`). Подсветка: проверить, есть ли D в Monaco. Если нет —
  Monarch-грамматика по образцу `config/editor/zig` + регистрация в `initEditor.ts:49`.
- Прогнать `make test-code-checkers` и сыграть несколько задач всех типов (hash, вложенные
  массивы, float).

---

## Решения

- Фазу 0 (security-фиксы) сделал Claude 2026-10-09; фазы 1–4 реализует команда по этому плану.
- Исключённого игрока (кик или бан) раунд не ждёт. Если в его матче не осталось реальных
  игроков — игра заканчивается таймаутом, а не технической победой (не портим базовый балл
  задачи). Если остался реальный соперник — раунд ждёт его, а исключённый не может выиграть.
- Раннеры: прод на x86_64, все образы — multi-arch (amd64 + arm64) → D на ldc2.
- Post-timeout запуски пишутся в `code_check_runs` как обычные, пока жив процесс игры.
- Соперник и зрители видят post-timeout проверку (бейдж). Не принципиально: если тяжело,
  результат видит только сам игрок.
- CORS для `/public_api` не нужен: клиенты — CLI и боты.
- `X-Forwarded-For` на проде работает корректно, IP-лимиты для public API не делаем: лимиты и
  квоты только по пользователю — владельцу токена.
- Public API узкое: только «вокруг меня», чужое = 404, нет списков и поиска пользователей,
  токен обязателен везде. Запись — создание игр (по уровню) и приватных турниров
  (`grade: "open"`, без ивентов и пакетов).
- Значения по умолчанию, которые можно крутить без пересмотра дизайна: лимиты и квоты (3.6),
  возраст аккаунта для write-скоупов (7 дней), окно расписания (14 дней), границы полей
  турнира (3.4).
