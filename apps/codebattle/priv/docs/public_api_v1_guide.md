# Codebattle Public API v1

A small, me-centric HTTP API for bots, CLIs, editors and devices: see your live game and history,
start games against Codebot or a friend, run your own tournaments.

- **Base URL:** `https://codebattle.hexlet.io/public_api/v1`
- **Format:** JSON in, JSON out (`Content-Type: application/json` on requests with a body)
- **Machine-readable spec:** [`/public_api/v1/openapi.json`](/public_api/v1/openapi.json) (OpenAPI 3.1)
- **This page as Markdown:** [`/api-docs.md`](/api-docs.md), handy for pasting into an LLM

## Quickstart

1. Open **Settings → API tokens** on codebattle and create a token. Copy it right away: it is
   shown only once and looks like `cbp_...`.
2. Call the API with the token in the `Authorization` header:

```bash
export CODEBATTLE_TOKEN=cbp_your_token_here

curl -s https://codebattle.hexlet.io/public_api/v1/me \
  -H "Authorization: Bearer $CODEBATTLE_TOKEN"
```

```json
{"user": {"id": 42, "name": "ada", "avatar_url": null, "rating": 1461, "rank": 12, "lang": "dlang"}}
```

3. Start a game against Codebot (needs the `games:write` scope) and watch it:

```bash
curl -s -X POST https://codebattle.hexlet.io/public_api/v1/games \
  -H "Authorization: Bearer $CODEBATTLE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"level": "easy", "opponent": "bot"}'

curl -s https://codebattle.hexlet.io/public_api/v1/me/active_game \
  -H "Authorization: Bearer $CODEBATTLE_TOKEN"
```

You solve the task in the browser at the game `url`; the API tells you what is going on.

The same from Ruby, without gems. Note the explicit `Content-Type`: without it `Net::HTTP`
sends the body as a form and the API answers `415`.

```ruby
require "net/http"
require "json"

uri = URI("https://codebattle.hexlet.io/public_api/v1/games")
req = Net::HTTP::Post.new(uri, "Authorization" => "Bearer #{ENV["CODEBATTLE_TOKEN"]}",
                               "Content-Type" => "application/json")
req.body = {level: "easy", opponent: "bot"}.to_json
res = Net::HTTP.start(uri.host, uri.port, use_ssl: true) { |http| http.request(req) }
puts JSON.parse(res.body)
```

## Authentication

Every request needs a personal token in the header (query parameters are never accepted):

```http
Authorization: Bearer cbp_...
```

A token belongs to one user, acts as that user and carries **scopes**:

| Scope | Allows |
|-------|--------|
| `read` | All `GET` endpoints |
| `games:write` | Create and cancel your games |
| `tournaments:write` | Create, edit, start and cancel your tournaments |

- Tokens with write scopes must have an expiry (30, 90 or 365 days) and can be created only by
  accounts older than 7 days. A read-only token may live forever.
- A user can have up to 10 active tokens. Tokens are revoked when you change your password, and
  stop working immediately if the account is banned or archived.
- Treat a token like a password: keep it out of git and client-side code.

## Conventions

- **Times** are ISO 8601 in UTC, e.g. `2026-10-10T19:03:18Z`.
- **Countdowns:** endpoints that matter for timing return `server_time`. Compute remaining time as
  `ends_at - server_time` instead of trusting the device clock.
- **Privacy by 404:** an object that exists but is not related to you answers exactly like a missing
  one (`404 not_found`), so probing ids reveals nothing.
- **JSON bodies:** send request bodies as JSON with `Content-Type: application/json`. Many HTTP
  clients (Ruby `Net::HTTP`, `curl -d`) default to form encoding; such requests get `415`.
- **Strict bodies:** unknown fields in a request body are an error (`422`), not silently ignored.
- **Live games hide the opponent's progress:** `result_percent` of other players appears only after
  the game is over.
- **Versioning:** v1 only gets additive changes (new endpoints, new fields). Ignore fields you don't
  know.

## Pagination

`GET /me/games` uses keyset (cursor) pagination, which stays correct while new games keep arriving:

1. Request the first page without `cursor`: you get up to 50 games, newest first, and `next_cursor`.
2. Pass `next_cursor` back as `cursor` to get the next, older page.
3. `next_cursor: null` means there are no more pages.

The cursor is simply the id of the last game on the page. To get games from a period instead of
walking pages, use `from` and `to` (ISO 8601 dates or datetimes, by game start time). They combine
with `cursor` if a period has more than 50 games.

```bash
curl -s "https://codebattle.hexlet.io/public_api/v1/me/games?from=2026-10-01&to=2026-10-08" \
  -H "Authorization: Bearer $CODEBATTLE_TOKEN"
```

The tournament ranking for creators and moderators uses `page` / `page_size` instead.

## Errors

Every error has the same shape:

```json
{"error": {"code": "validation_failed", "message": "Invalid parameters: level is required", "details": {"level": "is required"}}}
```

For `validation_failed`, `message` lists every failed field and `details` maps each field to what
is wrong with it, for programs.

| HTTP | `code` | Meaning |
|------|--------|---------|
| 401 | `unauthorized` | No `Authorization: Bearer` header |
| 401 | `invalid_token` | The token is unknown, expired or revoked |
| 403 | `insufficient_scope` | The token lacks the scope this endpoint needs |
| 404 | `not_found` | Missing, or not related to you |
| 415 | `unsupported_media_type` | A request body sent without `Content-Type: application/json` |
| 422 | `validation_failed` | Bad or unknown parameters, or an action not allowed in the current state |
| 429 | `rate_limited` | Too many requests, see below |
| 429 | `quota_exceeded` | Too many games or tournaments created |
| 503 | `api_disabled` | The API (or its write operations) is temporarily switched off |

## Limits

Limits are per user, shared by all of the user's tokens.

| What | Limit |
|------|-------|
| Requests | 60 per minute. Responses carry `x-ratelimit-limit` and `x-ratelimit-remaining` |
| `404` responses | More than 30 in 10 minutes blocks the API for an hour |
| Games created | 5 per minute, 30 per day |
| Tournaments created | 5 per day, at most 3 unfinished at a time |

Polling `GET /me/active_game` every 5–10 seconds fits comfortably in the limit.

## Recipes

**Device that vibrates 10 minutes before the end of a game.** Poll `GET /me/active_game`; when
`game` is not `null`, store `ends_at - server_time` as the remaining time and count down locally.
Re-sync on every poll.

**Bot that runs a private tournament.** `POST /tournaments` with `name`, `description`,
`starts_at`, `level`, send players the returned `invite_url`, then `POST /tournaments/{id}/start`
when everyone has joined, and read `GET /tournaments/{id}/ranking`.

**Export your history.** Walk `GET /me/games` with `cursor` until `next_cursor` is `null`, or ask for
one period with `from` / `to`.
