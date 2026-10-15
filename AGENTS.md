# Repository Guidelines

## Project Structure & Module Organization
This is a single Phoenix/Elixir application at the repository root.
- Phoenix app with Elixir code in `lib/`, tests in `test/`, the React frontend in `frontend/` (Inertia pages in `frontend/src/pages/`), and static files (images, audio, fonts) in `static/` served at `/assets/*`.
- `lib/codebattle/runner/`: shared language metadata, checker generators, and local Docker execution.
- `images/`: language images containing the Zig HTTP runners.
- `config/`, `priv/`, and `mix.exs` provide application configuration and the Codebattle release.

## Main Contexts & Helpers
Core domains expose context modules for public APIs:
- `Codebattle.Game.Context` (`lib/codebattle/game/context.ex`): game lifecycle, live game access, and player actions.
- `Codebattle.Tournament.Context` (`lib/codebattle/tournament/context.ex`): tournament CRUD, live supervision, and access checks.
- `Codebattle.Tournament.Round.Context` (`lib/codebattle/tournament/round/context.ex`): round construction and persistence.
- `Codebattle.Playbook.Context` (`lib/codebattle/playbook/context.ex`): game replay records and storage.
- `Codebattle.Event.Context` (`lib/codebattle/event/context.ex`): event stages and tournament bootstrapping.
- `Codebattle.Bot.Context` (`lib/codebattle/bot/context.ex`): bot selection and runtime start.

Helper modules live alongside their domains:
- Game helpers: `lib/codebattle/game/helpers.ex`; tournament helpers: `lib/codebattle/tournament/helpers.ex`.
- Operational utilities: `lib/codebattle/utils/` (populate tasks/users/clans, release helpers).

## Build, Test, and Development Commands
**Run every repository command through the dev container.** The host has no
usable environment for this project, even where a matching toolchain is
installed: `_build`, `deps`, `node_modules`, and `priv/plts` are Docker volumes
rather than host directories, and PostgreSQL is reachable only as `db:5432`
inside the Compose network — it is deliberately not published to the host. A
host-side `mix test` or `pnpm` run therefore compiles into a different tree and
cannot reach the database.

- Prefer an existing `make` target (listed below).
- Otherwise use `make dev-exec CMD='...'` or `./bin/dev <command>`; both route
  through `docker compose exec` into the container.
- Never invoke `mix`, `iex`, `pnpm`, `node`, or `go` from a host shell, and do
  not drive `docker compose` by hand — use the `dev-*` targets so the Compose
  project name and project directory stay consistent.
- The targets work unchanged from a host terminal or from a terminal inside the
  container: `bin/dev` detects `CODEBATTLE_DEVCONTAINER=1` and execs directly
  instead of re-entering.

Host-only exceptions — these drive the host container engine and refuse to run
inside the dev container:
- Container lifecycle: `make dev-build`, `dev-rebuild`, `dev-stop`, `dev-down`,
  `dev-logs`, `clean`.
- Image build and publish: `make build-local`, `build-codebattle`, `build-arm`,
  `push-codebattle`, `push-codeabttle-arm`, and
  the runner image Makefiles under `images/`. These orchestrate
  other containers; treat them as privileged and run them only on trusted code.
- Ops tooling: `make terraform-vars-generate`, `ansible-edit-secrets`,
  `ansible-vault-edit-production`.

Common targets:
- `make format` / `make lint`: format or check Elixir formatting.
- `make credo`: run Credo static analysis.
- `make lint-js`: OXC (`oxlint`) for the frontend.
- `make server`: start Phoenix (`iex -S mix phx.server`).
- `make test`: ExUnit + coveralls JSON.
- `make test-code-checkers`: image executor tests with `CODEBATTLE_EXECUTOR=local`.

For frontend-only tasks, use `make test-fe` (typecheck + build), `make check-js`, or
`make dev-exec CMD='pnpm --dir frontend <command>'` so pnpm remains in
the development container.

## Coding Style & Naming Conventions
- Elixir formatting is enforced via `mix format` (see `.formatter.exs`).
- Credo rules live in `.credo.exs` (120-char line limit).
- JavaScript/React linting uses OXC (`oxlint`) via `pnpm run lint`.
- Naming: descriptive Elixir modules; `camelCase`/`PascalCase` for JS files and components.

## Testing Guidelines
- Use `make test` as the canonical final repository test command; do not substitute a direct `mix test` run.
- Run `mix credo --strict` and `mix dialyzer` as part of the final repository verification.
- ExUnit tests live in `test/`; coverage uses ExCoveralls with a 60% threshold.
- The frontend has no unit-test runner; `make test-fe` typechecks and builds it.
- Name tests after the module under test (e.g., `user_stats_test.exs`).

## Commit & Pull Request Guidelines
- Recent commits use short, imperative summaries (e.g., "Fix editor", "Update logo").
- Keep commits focused; include test results when relevant.
- PRs should describe the change, list test commands run, and attach screenshots for UI updates.

## Configuration & Runtime Notes
- The `codebattle` release is defined in `mix.exs`; runner images build via Makefiles in `images/`.
