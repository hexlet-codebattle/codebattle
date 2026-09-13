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

### Profile js bundle

### Support

- [https://t.me/hexletcommunity](https://t.me/hexletcommunity/5) channel: codebattle


### Troubleshooting

#### Port already in use

The dev container publishes Phoenix on `127.0.0.1:4000` and Vite on
`127.0.0.1:8080`. If another project holds one of them, `docker compose up`
fails with `failed to bind host port ... address already in use` and the
container never starts.

`bin/dev` and the devcontainer `initializeCommand` run `.devcontainer/preflight`
first, which names the offending process. Either stop it, or move the dev
container to free ports in `.env`:

```
CODEBATTLE_PORT=4010
CODEBATTLE_VITE_PORT=8090
```

Both variables are read by Compose and by `vite.config.js`, so the container
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
