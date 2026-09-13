# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Codebattle

Open-source competitive programming platform where users solve coding tasks head-to-head in real-time. Built by the Hexlet community. Supports 20+ programming languages via containerized execution.

## Tech Stack

- **Backend:** Elixir 1.20.2 / OTP 29.0.3, Phoenix ~1.8 with LiveView
- **Frontend:** React + Redux Toolkit, Vite, Monaco Editor
- **Database:** PostgreSQL
- **Code Execution:** Docker/Podman containers per language (runner service)
- **Package Manager:** pnpm (not npm) for frontend

## Project Structure

Elixir umbrella project with two apps under `apps/`:
- `codebattle` — Main Phoenix web app (backend + frontend assets)
- `runner` — HTTP service that executes user code in isolated containers; language images in `apps/runner/images/`

Frontend source lives in `apps/codebattle/assets/js/` with React widgets, Redux slices, and XState machines.

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
make test-fe                    # Vitest frontend tests
make test-code-checkers         # Image executor tests (CODEBATTLE_EXECUTOR=local)

# Single Elixir test file:
make dev-exec CMD='mix test apps/codebattle/test/codebattle/game/context_test.exs'

# Single frontend test:
make dev-exec CMD='pnpm --dir apps/codebattle test UserStats.test.jsx'
```

### Linting & Formatting
```bash
make format                     # mix format
make lint                       # mix format --check-formatted
make credo                      # Credo static analysis
make dialyzer                   # Type checking
make lint-js                    # OXLint + stylelint
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
- JavaScript: OXLint (`.oxlintrc.json`), Prettier, Stylelint
- Coverage threshold: 60% minimum (ExCoveralls)

## CI Pipeline

GitHub Actions (`.github/workflows/master.yml`): runs ExUnit, Credo, Dialyzer, format check, frontend lint + tests, then builds and pushes container images to `ghcr.io/hexlet-codebattle/`.
