# Codebattle MCP (Model Context Protocol) Module

Модуль реализует сервер Model Context Protocol (MCP) для Codebattle с поддержкой авторизации OAuth 2.0 (PKCE S256). Предоставляет внешним AI-агентам и клиентам доступ к операциям платформы (управление играми, турнирами, просмотр профиля и лидербордов).

---

## Архитектура и структура файлов

```text
lib/codebattle/mcp/
├── server.ex               # Точка входа MCP-сервера (Hermes.Server): обработка tools/list и tools/call
├── tools.ex                # Реестр, схема и валидация инструментов (Tools), маппинг на Public API
├── oauth.ex                # Контекст OAuth 2.0 (PKCE, выдача, ротация и отзыв токенов)
├── oauth/                  # Схемы Ecto для сущностей OAuth
│   ├── client.ex           # Зарегистрированные публичные OAuth-клиенты
│   ├── code.ex             # Одноразовые Authorization Codes с PKCE S256
│   ├── connection.ex       # Соединения (сессии) пользователя с клиентом
│   └── token.ex            # Пары access / refresh токенов (хранятся хэши SHA-256)
└── README.md               # Документация и спецификация модуля для разработчиков и агентов
```

Веб-уровень и контроллеры MCP расположены в `lib/codebattle_web/controllers/mcp/` и `lib/codebattle_web/plugs/`.

---

## Правила добавления новых инструментов (MCP Tools)

1. **OpenAPI First**:
   - Основные инструменты берутся из контракта `priv/openapi/public_api_v1.json`.
   - Если нужного метода еще нет в OpenAPI, сначала опишите его в спецификации.
2. **Регистрация операции в `tools.ex`**:
   - Добавьте кортеж в `@operations` внутри `lib/codebattle/mcp/tools.ex`:
     ```elixir
     {"tool_name", "http_method", "/path/{param}", TargetController, :action}
     ```
   - Схемы входных параметров и описания автоматически сформируются из OpenAPI.
3. **Кастомные инструменты**:
   - Если инструмент агрегирует данные нескольких эндпоинтов (как `get_my_state` или `get_event_leaderboard`), реализуйте для него отдельную приватную функцию генерации схемы в `tools.ex` и добавьте в список `all/0`.
4. **Безопасность и Scopes**:
   - Поддерживаемые scopes: `read`, `games:write`, `tournaments:write`, `offline_access`.
   - Назначение `annotations` (`readOnlyHint`, `destructiveHint`, `idempotentHint`) формируется автоматически на основе HTTP-метода в `server.ex`.

---

## Спецификация безопасности и OAuth 2.0

- **Тип клиентов**: только публичные клиенты (Public Clients), `client_secret` не поддерживается и запрещен.
- **Grant Types**: `authorization_code` с обязательным **PKCE S256** и `refresh_token`.
- **Хранение секретов**:
  - Никакие токены (`access_token`, `refresh_token`) и коды (`code`) не хранятся в открытом виде.
  - В БД сохраняются исключительно `SHA-256` хэши.
- **Ротация Refresh токенов**:
  - При каждом обновлении токена старый помечается как использованный (`consumed_at`).
  - При попытке повторного использования старого токена (защита от Replay Attack) автоматически отзывается всё соединение (`Connection`).
- **Блокировки (Locks)**:
  - Операции обмена кодов и обновления токенов выполняются внутри транзакций с пессимистической блокировкой `FOR UPDATE` (`transact/2`).

---

## Спецификация ролей агентов, взаимодействующих с модулем

### 1. Tournament Manager Agent
- **Назначение**: Автоматизация создания, запуска и мониторинга турниров.
- **Scopes**: `read`, `tournaments:write`.
- **Ключевые инструменты**: `create_tournament`, `update_tournament`, `start_tournament`, `cancel_tournament`, `get_tournament`, `get_tournament_ranking`.

### 2. Player Companion Agent
- **Назначение**: Личный ассистент игрока (статистика, подбор задач, участие в матчах).
- **Scopes**: `read`, `games:write`.
- **Ключевые инструменты**: `get_my_state`, `get_me`, `list_tasks`, `create_game`, `join_game`, `list_my_games`.

### 3. Community / Leaderboard Agent
- **Назначение**: Мониторинг рейтинга игроков и кланов.
- **Scopes**: `read`.
- **Ключевые инструменты**: `get_event_leaderboard`, `list_online_users`, `list_invites`.

### 4. Admin Agent
- **Назначение**: Управление платформой и работа с отзывами/обратной связью пользователей.
- **Scopes**: `read` (с правами администратора).
- **Ключевые инструменты**: `list_feedback`, `update_feedback`.
