# Repository Guidelines

## Project Structure & Module Organization
This is an Elixir umbrella app with multiple sub-apps under `apps/`.
- `apps/codebattle/`: Phoenix app with Elixir code in `apps/codebattle/lib/`, tests in `apps/codebattle/test/`, and frontend assets in `apps/codebattle/assets/`.
- `apps/runner/`: task runner service and language images under `apps/runner/images/`.
- `apps/phoenix_gon/`, `config/`, `priv/`, and top-level `mix.exs` provide shared library/config and releases.

## Main Contexts & Helpers
Core domains expose context modules for public APIs:
- `Codebattle.Game.Context` (`apps/codebattle/lib/codebattle/game/context.ex`): game lifecycle, live game access, and player actions.
- `Codebattle.Tournament.Context` (`apps/codebattle/lib/codebattle/tournament/context.ex`): tournament CRUD, live supervision, and access checks.
- `Codebattle.Tournament.Round.Context` (`apps/codebattle/lib/codebattle/tournament/round/context.ex`): round construction and persistence.
- `Codebattle.Playbook.Context` (`apps/codebattle/lib/codebattle/playbook/context.ex`): game replay records and storage.
- `Codebattle.Event.Context` (`apps/codebattle/lib/codebattle/event/context.ex`): event stages and tournament bootstrapping.
- `Codebattle.Bot.Context` (`apps/codebattle/lib/codebattle/bot/context.ex`): bot selection and runtime start.

Helper modules live alongside their domains:
- Game helpers: `apps/codebattle/lib/codebattle/game/helpers.ex`; tournament helpers: `apps/codebattle/lib/codebattle/tournament/helpers.ex`.
- Operational utilities: `apps/codebattle/lib/codebattle/utils/` (populate tasks/users/clans, release helpers).

## Build, Test, and Development Commands
Use the Makefile targets for common workflows:
- `make format` / `make lint`: format or check Elixir formatting.
- `make credo`: run Credo static analysis.
- `make lint-js`: OXC (`oxlint`) for frontend assets.
- `make server`: start Phoenix (`iex -S mix phx.server`).
- `make test`: ExUnit + coveralls JSON.
- `make test-code-checkers`: image executor tests with `CODEBATTLE_EXECUTOR=local`.

For frontend-only tasks in `apps/codebattle/`:
- `pnpm run dev`: Vite dev server.
- `pnpm run build`: production build.
- `pnpm run test`: Jest tests.

## Coding Style & Naming Conventions
- Elixir formatting is enforced via `mix format` (see `.formatter.exs`).
- Credo rules live in `.credo.exs` (120-char line limit).
- JavaScript/React linting uses OXC (`oxlint`) via `pnpm run lint`.
- Naming: descriptive Elixir modules; `camelCase`/`PascalCase` for JS files and components.

## Testing Guidelines
- ExUnit tests live in `apps/*/test/`; coverage uses ExCoveralls with a 60% threshold.
- Frontend tests use Jest in `apps/codebattle/`.
- Name tests after the module/component under test (e.g., `user_stats_test.exs`, `UserStats.test.jsx`).

## Commit & Pull Request Guidelines
- Recent commits use short, imperative summaries (e.g., "Fix editor", "Update logo").
- Keep commits focused; include test results when relevant.
- PRs should describe the change, list test commands run, and attach screenshots for UI updates.

## Configuration & Runtime Notes
- Releases are defined in `mix.exs` for `codebattle` and `runner`; runner images build via Makefiles in `apps/runner/images/`.
