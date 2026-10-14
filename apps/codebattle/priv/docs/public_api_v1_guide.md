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
| `games:write` | Create and cancel your games; send, accept and cancel invites |
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

## Event stream

`GET /me/events` is a live stream of everything that happens to you, delivered as
[Server-Sent Events](https://html.spec.whatwg.org/multipage/server-sent-events.html) (SSE). It is
an ordinary HTTP request that stays open: the server keeps writing events into the response as
they happen. Use it instead of polling to react to invites, game starts and tournament rounds
within a second.

```bash
curl -sN https://codebattle.hexlet.io/public_api/v1/me/events \
  -H "Authorization: Bearer $CODEBATTLE_TOKEN" \
  -H "Accept: text/event-stream"
```

### Wire format

The response is `text/event-stream`. Each event is a few `field: value` lines followed by a blank
line; `data` is always one line of JSON with a `server_time`:

```text
id: 1791702012345
event: invite.created
data: {"invite":{"id":9001,"direction":"incoming","creator":{"id":77,"name":"grace","rating":1520,"avatar_url":null},...},"server_time":"2026-10-11T07:00:12Z"}

: ping
```

- Lines starting with `:` are comments. `: ping` arrives every 15 seconds so proxies keep the
  connection; ignore it (or use it to detect a dead connection: no bytes for 45 s → reconnect).
- `retry: 3000` at the start tells `EventSource` clients to reconnect after 3 seconds.
- `id` is a timestamp in milliseconds, for logging. Events are **not replayed**: after a reconnect
  the `hello` event brings the current state instead, so nothing is lost.

### Lifecycle

1. You connect and immediately get `hello` with your current state.
2. Events arrive as things happen.
3. After an hour the server sends `bye` and closes the stream. Reconnect right away.
4. If the connection drops for any other reason, reconnect after a few seconds.

At most 2 streams per user can be open at the same time; a third request gets `429 rate_limited`.

### Events

| Event | When | Payload (`data`) |
|-------|------|--------|
| `hello` | Right after connecting | `user` (Player), `active_game` (Game or `null`), `invites` (Invite[]), `tournaments` (unfinished Tournament[] you play in or run) |
| `invite.created` | Someone invited you, or you sent an invite | `invite` |
| `invite.accepted` | An invite between you and someone was accepted | `invite` with `game_id`, `game_url` |
| `invite.canceled` | Declined by the recipient or withdrawn by the creator | `invite` |
| `invite.dropped` | Dropped because one of you started another game | `invite` |
| `game.created` | You created a game that waits for an opponent | `game` |
| `game.started` | A game with you started: against a bot, from an invite, someone joined your game, or a tournament round paired you | `game` |
| `game.finished` | Your game ended (`game_over` or `timeout`); results are visible | `game` |
| `game.canceled` | Your game was canceled before it finished | `game` |
| `tournament.joined` | You joined a tournament | `tournament` |
| `tournament.left` | You left a tournament | `tournament` |
| `tournament.player_joined` | Someone joined a tournament you created or moderate | `tournament`, `player` (Player) |
| `tournament.player_left` | Someone left a tournament you created or moderate | `tournament`, `player_id` |
| `tournament.started` | A tournament you play in or run started | `tournament` |
| `tournament.round_started` | A new round began; your game arrives as `game.started` | `tournament` |
| `tournament.round_finished` | A round ended; `tournament.break.active` and `ends_at` tell when the next round starts | `tournament` |
| `tournament.finished` | The tournament is over | `tournament` |
| `tournament.canceled` | The tournament was canceled | `tournament` |
| `tournament.restarted` | An admin restarted the tournament | `tournament` |
| `bye` | The server is closing the stream; reconnect | `reason` |

`game`, `tournament` and `invite` have the same fields as in the REST endpoints (see
**Objects**). New event types may appear in v1; skip the ones you don't know.

### Clients

**Ruby**, standard library only:

```ruby
require "net/http"
require "json"

uri = URI("https://codebattle.hexlet.io/public_api/v1/me/events")

loop do
  Net::HTTP.start(uri.host, uri.port, use_ssl: true, read_timeout: 45) do |http|
    req = Net::HTTP::Get.new(uri, "Authorization" => "Bearer #{ENV["CODEBATTLE_TOKEN"]}",
                                  "Accept" => "text/event-stream")
    http.request(req) do |res|
      buffer = +""
      res.read_body do |chunk|
        buffer << chunk
        while (block = buffer.slice!(/\A.*?\n\n/m))
          name = block[/^event: (.+)$/, 1]
          data = block[/^data: (.+)$/, 1]
          next unless name && data # pings and retry hints

          event = JSON.parse(data)
          case name
          when "invite.created"
            puts "Invite from #{event["invite"]["creator"]["name"]}" if event["invite"]["direction"] == "incoming"
          when "game.started"
            system("firefox", "--kiosk", event["game"]["url"])
          end
        end
      end
    end
  end
rescue StandardError => e
  warn "stream dropped: #{e.message}"
ensure
  sleep 3
end
```

**Python** with `requests`:

```python
import json, os, time, requests

URL = "https://codebattle.hexlet.io/public_api/v1/me/events"
HEADERS = {"Authorization": f"Bearer {os.environ['CODEBATTLE_TOKEN']}", "Accept": "text/event-stream"}

while True:
    try:
        with requests.get(URL, headers=HEADERS, stream=True, timeout=(10, 45)) as res:
            name = None
            for line in res.iter_lines(decode_unicode=True):
                if line.startswith("event: "):
                    name = line[7:]
                elif line.startswith("data: ") and name:
                    print(name, json.loads(line[6:]))
                elif line == "":
                    name = None
    except requests.RequestException as error:
        print("stream dropped:", error)
    time.sleep(3)
```

**JavaScript** (Node 18+ or a browser; `EventSource` can't send the `Authorization` header, so
read the stream with `fetch`):

```js
const res = await fetch("https://codebattle.hexlet.io/public_api/v1/me/events", {
  headers: { Authorization: `Bearer ${process.env.CODEBATTLE_TOKEN}`, Accept: "text/event-stream" },
});
const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
let buffer = "";
for (;;) {
  const { value, done } = await reader.read();
  if (done) break; // reconnect here
  buffer += value;
  let end;
  while ((end = buffer.indexOf("\n\n")) >= 0) {
    const block = buffer.slice(0, end);
    buffer = buffer.slice(end + 2);
    const name = block.match(/^event: (.+)$/m)?.[1];
    const data = block.match(/^data: (.+)$/m)?.[1];
    if (name && data) console.log(name, JSON.parse(data));
  }
}
```

If your environment can't keep a connection open (some corporate proxies, cron jobs), use
long polling on `GET /me/invites?wait=25` instead, or poll the REST endpoints.

## Limits

Limits are per user, shared by all of the user's tokens.

| What | Limit |
|------|-------|
| Requests | 60 per minute. Responses carry `x-ratelimit-limit` and `x-ratelimit-remaining` |
| `404` responses | More than 30 in 10 minutes blocks the API for an hour |
| Games created | 5 per minute, 30 per day |
| Tournaments created | 5 per day, at most 3 unfinished at a time |
| Event streams | 2 open at a time; each lives up to an hour |

Polling `GET /me/active_game` every 5–10 seconds fits comfortably in the limit, but the
[event stream](#event-stream) is better: one connection, events within a second.

## Recipes

**Device that vibrates 10 minutes before the end of a game.** Listen to the event stream: on
`game.started` store `game.ends_at - server_time` as the remaining time and count down locally;
`game.finished` or `game.canceled` stops the countdown. (Without a stream, poll
`GET /me/active_game`.)

**Bot that runs a private tournament.** `POST /tournaments` with `name`, `description`,
`starts_at`, `level`, send players the returned `invite_url`, then `POST /tournaments/{id}/start`
when everyone has joined, and read `GET /tournaments/{id}/ranking`.

**React to invites when you can't hold a stream open.** The [event stream](#event-stream) is
the first choice. Without it, long-poll `GET /me/invites`:

```bash
version=""
while true; do
  resp=$(curl -s "https://codebattle.hexlet.io/public_api/v1/me/invites?wait=25&version=$version" \
    -H "Authorization: Bearer $CODEBATTLE_TOKEN")
  version=$(echo "$resp" | jq -r .version)
  echo "$resp" | jq '.invites[] | select(.direction == "incoming")'
done
```

The request returns as soon as the list changes (or after 25 s), so a new invite shows up within
a second at about two requests a minute. Accept it with `POST /invites/{id}/accept` and open
`game_url`.

**One voice command to a private tournament.** `POST /tournaments` with your preset of fields,
show `invite_url` as a QR code (the tournament page has a "Show QR" button too), wait for
`tournament.player_joined` on the [event stream](#event-stream), then
`POST /tournaments/{id}/start` and open the game from the `game.started` event.

**A game on a chosen task.** List the tasks of a level with `GET /tasks?level=medium` (add
`tags=strings,math` or `name=partition` to narrow it), then pass the `id` or the exact `name`:
`POST /games` with `{"task_name": "minimal_time_partition", "opponent": "bot"}`. The level comes
from the task. Invites take the same `task_id` / `task_name`. You only see and can pick public
tasks and your own.

**Export your history.** Walk `GET /me/games` with `cursor` until `next_cursor` is `null`, or ask for
one period with `from` / `to`.
