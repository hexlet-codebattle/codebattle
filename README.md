# Codebattle

[![Actions Status](https://github.com/hexlet-codebattle/codebattle/workflows/Build%20master/badge.svg)](https://github.com/hexlet-codebattle/codebattle/actions)
[![codecov](https://codecov.io/gh/hexlet-codebattle/codebattle/branch/master/graph/badge.svg)](https://codecov.io/gh/hexlet-codebattle/codebattle)

Codebattle - is an open source game being developed by the Hexlet community.
The current version of the application is available at [codebattle.hexlet.io](https://codebattle.hexlet.io).

This project exists thanks to all the people who contribute. [Contribute guideline.](CONTRIBUTING.md)

<a href="https://github.com/hexlet-codebattle/codebattle/graphs/contributors"><img src="https://opencollective.com/codebattle/contributors.svg?width=890"></a>

![Alt](https://repobeats.axiom.co/api/embed/cb0f9e443414905bb8a0e437460095b05bc11caf.svg "Repobeats analytics image")

### Requirements

- Mac / Linux
- Docker
- Optional: an editor that supports the [Dev Container specification](https://containers.dev/)

### Install

```bash
git clone git@github.com:hexlet-codebattle/codebattle.git
cd codebattle
make setup
```

`make setup` builds the pinned development image, installs Elixir and frontend
dependencies inside it, starts PostgreSQL, and prepares the database. Host
installations of Elixir, Erlang, Node.js, pnpm, and Go are not used.

To work from an editor, open the repository and choose **Reopen in Container**.
The same Make commands work in a host terminal and in the container terminal.

### Start Server

```bash
make server
```

- Open <http://localhost:4000>

### Run Tests

```bash
make test
make test-fe
```

### Lint

```bash
make lint
make credo
make check-js

# To run specific
make format
make lint-js-fix
```

### Useful

```bash
make console
make dev-shell
make dev-exec CMD='mix upload_langs'

make db-migrate
make dev-rebuild
make dev-down
make clean # Removes the development containers and their persistent volumes
```

All application commands run in the non-root development container. The source
tree is the only host directory mounted into it; dependency caches and database
data use Docker-managed volumes. Host Docker/Podman sockets and host credential
directories are intentionally not mounted.

The repository is writable inside the container, so keep only disposable
development credentials in `.env`. Never put production or personal cloud
credentials in the workspace. The host `.env` is masked in the container and
only the variables explicitly allowlisted in `compose.yml` are passed through.

Runner image build and publish targets still execute through the host container
engine because they orchestrate other containers. Treat those targets as
privileged operations and use them only with trusted code.

Codebattle is a single Phoenix app: `lib/`, `test/`, `priv/`, `frontend/`, and
`static/` live at the repository root. Shared language and checker code lives in
`lib/codebattle/runner/`; language image sources live in `images/`.

Solution checks use the Zig HTTP runner in separate language containers on the
Compose network. `make dev-up` starts JavaScript and Python runners by default;
`make server` starts Phoenix and Vite. The runner services are privileged to
create their per-request sandboxes, while the app container stays non-root and
does not receive a Docker socket. Runner ports are not published to the host.

Select languages with a comma-separated setting in the host `.env`:

```dotenv
CODEBATTLE_DEV_RUNNER_LANGS=js,python,cpp
```

Then run `make dev-up` and restart `make server`. The language picker uses the
same allowlist. Supported slugs are `clojure`, `cpp`, `csharp`, `dart`, `elixir`,
`golang`, `java`, `js`, `kotlin`, `php`, `python`, `ruby`, `rust`, `swift`, `ts`,
and `zig`. A shell environment value overrides `.env`. Previously started
runner containers may remain running until `make dev-down`.

If language images are already cached locally, refresh them with
`make dev-runner-pull` on the host, then `make dev-up` and restart the server.

To exercise the Zig runners through the game channels:

```bash
make dev-exec CMD='CODEBATTLE_EXECUTOR=zig mix test test/images/js_test.exs test/images/python_test.exs'
```

`CODEBATTLE_EXECUTOR=local` selects direct Docker execution where Docker is
available to the app. The standard dev container uses Zig services. Production
also defaults to Zig; `CODEBATTLE_ZIG_RUNNER_URL_TEMPLATE` overrides the Kubernetes
URL pattern, and `CODEBATTLE_WHITE_LIST_LANG_SLUGS` limits the language picker.

Editor devcontainer startup also starts the default JS and Python services.
For a custom list, run `make dev-up` from the host before opening the container
and update `.devcontainer/devcontainer.json`'s `runServices` list to match.

### Profile js bundle

### Translations

The interface supports English (`en`), Russian (`ru`), Spanish (`es`), and
Simplified Chinese (`zh`). Phoenix and React share the catalogs under
`priv/gettext/<locale>/LC_MESSAGES/`. Add frontend messages to each `default.po`;
Gettext extraction does not scan React files. Keep `%{placeholder}` names intact.

Task descriptions are translated separately. Task editors can use the description
language dropdown to add a translation. Players see the translations available
for that task, with English as the fallback when their preferred translation is
missing. Task imports accept `description_es` and `description_zh`; omitting these
fields preserves translations already saved on the platform.

See [Uploading tasks](docs/task-upload.md) for the API format and a working
multilingual example.

### Support

- [https://t.me/hexletcommunity](https://t.me/hexletcommunity/5) channel: codebattle


### Troubleshooting

#### Port already in use

The dev container publishes Phoenix on `127.0.0.1:4000` and Vite on
`127.0.0.1:8081`. If another project holds one of them, `docker compose up`
fails with `failed to bind host port ... address already in use` and the
container never starts.

`bin/dev` and the devcontainer `initializeCommand` run `.devcontainer/preflight`
first, which names the offending process. Either stop it, or move the dev
container to free ports in `.env`:

```
CODEBATTLE_PORT=4010
CODEBATTLE_FRONTEND_PORT=8091
```

Both variables are read by Compose and by `frontend/vite.config.ts`, so the container
and the dev server stay in sync.

#### macOS

- Install Docker

Make sure you have installed Docker Desktop for macOS.

```bash
brew install --cask docker
```

Or download Docker Desktop directly from: https://www.docker.com/products/docker-desktop

- Start Docker Desktop

Launch Docker Desktop from your Applications folder. The Docker icon will appear in your menu bar when it's running.

If you encounter issues, try restarting Docker Desktop from the menu bar icon or your Applications folder.

Docker Desktop will start automatically on boot by default. You can change this in Docker Desktop preferences if needed.

#### Linux

- Install Docker

Make sure you have installed Docker Engine for your Linux distribution.

Follow the official installation guide: https://docs.docker.com/engine/install/

- Start Docker service

Make sure Docker is running. You can start the Docker service manually by typing:

```bash
sudo systemctl start docker
```

or you can add it to startup by typing:

```bash
sudo systemctl enable docker
```

- Add your user to the docker group

To run Docker without sudo, add your user to the docker group:

```bash
sudo usermod -aG docker $USER
```

Then log out and log back in for the changes to take effect, or run:

```bash
newgrp docker
```

---

[![Hexlet Ltd. logo](https://raw.githubusercontent.com/Hexlet/assets/master/images/hexlet_logo128.png)](https://hexlet.io?utm_source=github&utm_medium=link&utm_campaign=codebattle)

This repository is created and maintained by the team and the community of Hexlet, an educational project. [Read more about Hexlet](https://hexlet.io?utm_source=github&utm_medium=link&utm_campaign=codebattle).

See most active contributors on [hexlet-friends](https://friends.hexlet.io/).
