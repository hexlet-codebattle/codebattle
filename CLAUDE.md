# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Codebattle

Open-source competitive programming platform where users solve coding tasks head-to-head in real-time. Built by the Hexlet community. Supports 20+ programming languages via containerized execution.

## Tech Stack

- **Backend:** Elixir 1.19.4 / OTP 28.2, Phoenix ~1.8 with LiveView
- **Frontend:** React + Redux Toolkit, Vite, Monaco Editor
- **Database:** PostgreSQL
- **Code Execution:** Docker/Podman containers per language (runner service)
- **Package Manager:** pnpm (not npm) for frontend

## Project Structure

Elixir umbrella project with three apps under `apps/`:
- `codebattle` — Main Phoenix web app (backend + frontend assets)
- `runner` — HTTP service that executes user code in isolated containers; language images in `apps/runner/images/`
- `phoenix_gon` — Shared library for passing server data to frontend

Frontend source lives in `apps/codebattle/assets/js/` with React widgets, Redux slices, and XState machines.

See `AGENTS.md` for detailed module organization and core domain contexts.

## Common Commands

### Development
```bash
make compose                    # Start app + db via Docker Compose
make server                     # Local: iex -S mix phx.server
make console                    # Local: iex -S mix
cd apps/codebattle && pnpm run dev  # Vite dev server with HMR (port 8080)
```

### Testing
```bash
make test                       # ExUnit + coverage (excludes image_executor)
make test-code-checkers         # Image executor tests (CODEBATTLE_EXECUTOR=local)
make compose-test               # Tests in Docker
cd apps/codebattle && pnpm test # Jest frontend tests

# Single Elixir test file:
mix test apps/codebattle/test/codebattle/game/context_test.exs

# Single frontend test:
cd apps/codebattle && pnpm test UserStats.test.jsx
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
make setup                      # Full first-time setup (Docker)
make setup-env-local            # Local setup without Docker (requires asdf)
make compose-db-setup           # Create + migrate database
make compose-db-migrate         # Apply pending migrations
```

## Code Style

- Elixir: enforced by `mix format` and Credo (120-char line limit)
- JavaScript: OXLint (`.oxlintrc.json`), Prettier, Stylelint
- Coverage threshold: 60% minimum (ExCoveralls)

## CI Pipeline

GitHub Actions (`.github/workflows/master.yml`): runs ExUnit, Credo, Dialyzer, format check, frontend lint + tests, then builds and pushes container images to `ghcr.io/hexlet-codebattle/`.
