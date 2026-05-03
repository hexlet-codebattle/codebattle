# Dima

Terminal-based load generator for Codebattle group tournaments.

```bash
make dima huyach
```

That's "Dima, hit it" — Dima will load-test your group tournament.

## TUI keys

- `c` create a group tournament scenario through `ext_api` and prepare synthetic users
- `j` make the prepared users join the group tournament channel
- `s` start the tournament through the admin channel (`start_group_tournament`)
- `1` / `2` switch all workers to `python` / `cpp`
- `+` / `-` increase / decrease per-user submit delay (ms)
- `p` / `u` pause or resume all workers
- `q` quit

## Run

```bash
make dima huyach DIMA_ARGS="-config ./tools/dima/dima.toml"
```

Or directly:

```bash
cd tools/dima
go run ./cmd/dima \
  -server http://localhost:4000 \
  -auth-key x-key \
  -users 200 \
  -group-task-id 1 \
  -slice-size 16 \
  -slice-strategy random \
  -avg-submit-seconds 20 \
  -randomness 30 \
  -join-ramp-seconds 5 \
  -langs python,cpp
```

## Prerequisites

Server side must enable the load-test feature flag:

```elixir
FunWithFlags.enable(:allow_load_tests_ext_api)
FunWithFlags.enable(:group_tasks_api)
```

A `group_task` row must exist with a reachable `runner_url`. Pass its id via
`-group-task-id`, or omit the flag to pick the first one available.

The auth key must match `CODEBATTLE_API_AUTH_KEY` on the server.

## How it works

1. `c` posts `POST /ext_api/load_tests/group_scenarios`. The server creates a
   `group_tournament` (in `waiting_participants` state), `users_count`
   synthetic users, plus a `UserGroupTournament` and bearer token per user.
2. `j` opens a Phoenix socket per user and joins
   `group_tournament:<id>:user:<user_id>`. Each worker then submits a
   solution every `avg-submit-seconds` (with jitter) by calling
   `POST /api/v1/group_task_solutions` with the bearer token.
3. `s` opens an admin socket and pushes `start_group_tournament` on the
   tournament topic, flipping state to `active`. The slice runner inside
   the server then takes over running submitted code in batches.
4. The TUI listens for `group_tournament:run_updated` broadcasts and tracks
   per-user best score.

## Solution pools

Drop one solution per file into a directory per language. Bots pick a random
file from the matching pool on every submission.

```
solutions/
├── python/
│   ├── sol_constant.py
│   ├── sol_input_echo.py
│   └── ...
└── cpp/
    ├── sol_constant.cpp
    └── ...
```

Wire it via flags:

```bash
go run ./cmd/dima \
  -python-solutions-dir ./solutions/python \
  -cpp-solutions-dir ./solutions/cpp \
  ...
```

Or via env vars: `DIMA_PYTHON_SOLUTIONS_DIR`, `DIMA_CPP_SOLUTIONS_DIR`.

If a directory is empty or missing the worker falls back to a tiny baked-in
stub. The TUI shows the loaded pool size next to each language's submit
delay, so you can confirm your files were picked up.

## TOML config

Anything that takes a flag also reads from `dima.toml`. CLI > TOML > .env >
built-in defaults.

```bash
cp dima.example.toml dima.toml
go run ./cmd/dima -config ./dima.toml
```

See `dima.example.toml` for the full schema.
