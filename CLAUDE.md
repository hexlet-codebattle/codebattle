# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Codebattle

Open-source competitive programming platform where users solve coding tasks head-to-head in real-time. Built by the Hexlet community. Supports 20+ programming languages via containerized execution.

## Tech Stack

- **Backend:** Elixir 1.20.4 / OTP 29.0.3, Phoenix ~1.8 with LiveView
- **Frontend:** React + Mantine 9 (CSS Modules), Zustand + TanStack Query, Inertia, Vite, Monaco Editor
- **Database:** PostgreSQL
- **Code Execution:** Docker/Podman containers per language (runner service)
- **Package Manager:** pnpm (not npm) for frontend

## Project Structure

Single Elixir/Phoenix application at the repository root:
- `codebattle` — Main Phoenix web app (backend + frontend assets)
- `lib/codebattle/runner/` — shared language metadata, checker generators, and local Docker execution
- `images/` — language images with Zig HTTP runners

Frontend source lives in `frontend/src/`: Inertia pages in `pages/`, features in `features/`, theme in `theme/`. Static files (images, audio, fonts) live in `static/` and are served at `/assets/*`; i18n strings are keyed by English text in `priv/gettext/*/LC_MESSAGES/default.po`.

See `AGENTS.md` for detailed module organization and core domain contexts.

## Common Commands

### Development
```bash
make server                     # Start/enter the dev container and run Phoenix + Vite
make console                    # IEx in the dev container
make dev-shell                  # Shell in the dev container
make dev-exec CMD='mix help'    # Run an arbitrary command in the dev container
```

### Testing
```bash
make test                       # ExUnit + coverage (excludes image_executor)
make test-fe                    # Frontend typecheck + build
make test-code-checkers         # Image executor tests (CODEBATTLE_EXECUTOR=local)

# Single Elixir test file:
make dev-exec CMD='mix test test/codebattle/game/context_test.exs'
```

### Linting & Formatting
```bash
make format                     # mix format
make lint                       # mix format --check-formatted
make credo                      # Credo static analysis
make dialyzer                   # Type checking
make lint-js                    # OXLint (frontend)
make lint-js-fix                # Auto-fix JS lint issues
```

### Setup
```bash
make setup                      # Full first-time dev-container setup
make dev-rebuild                # Rebuild after a toolchain/container change
make db-setup                   # Create, migrate, and seed database
make db-migrate                 # Apply pending migrations
```

The Make targets run through `bin/dev`. From the host it starts and enters the
Compose-backed dev container; from inside that container it executes directly.
Do not mount host Docker sockets or credential directories into the app service.

## Code Style

- Elixir: enforced by `mix format` and Credo (120-char line limit)
- TypeScript: OXLint (`frontend/.oxlintrc.json`), `tsc --noEmit`
- Coverage threshold: 60% minimum (ExCoveralls)

## CI Pipeline

GitHub Actions (`.github/workflows/master.yml`): runs ExUnit, Credo, Dialyzer, format check, frontend lint + typecheck + build, then builds and pushes container images to `ghcr.io/hexlet-codebattle/`.
