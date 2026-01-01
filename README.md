# Codebattle

[![Actions Status](https://github.com/hexlet-codebattle/codebattle/workflows/Build%20master/badge.svg)](https://github.com/hexlet-codebattle/codebattle/actions)
[![codecov](https://codecov.io/gh/hexlet-codebattle/codebattle/branch/master/graph/badge.svg)](https://codecov.io/gh/hexlet-codebattle/codebattle)
[![Maintainability](https://api.codeclimate.com/v1/badges/a99a88d28ad37a79dbf6/maintainability)](https://codeclimate.com/github/hexlet-codebattle/codebattle/maintainability)
[![codebeat badge](https://codebeat.co/badges/7557979e-74a7-45a6-b9ab-dcd44bab7e5b)](https://codebeat.co/projects/github-com-hexlet-codebattle-codebattle-master)
[![Hits](https://hits.seeyoufarm.com/api/count/incr/badge.svg?url=https%3A%2F%2Fgithub.com%2Fhexlet-codebattle%2Fcodebattle&count_bg=%2379C83D&title_bg=%23555555&icon=&icon_color=%23E7E7E7&title=hits&edge_flat=false)](https://hits.seeyoufarm.com)

Codebattle - is an open source game being developed by the Hexlet community.
The current version of the application is available at [codebattle.hexlet.io](https://codebattle.hexlet.io).

This project exists thanks to all the people who contribute. [Contribute guideline.](CONTRIBUTING.md)

<a href="https://github.com/hexlet-codebattle/codebattle/graphs/contributors"><img src="https://opencollective.com/codebattle/contributors.svg?width=890"></a>

![Alt](https://repobeats.axiom.co/api/embed/cb0f9e443414905bb8a0e437460095b05bc11caf.svg "Repobeats analytics image")

### Requirements

- Mac / Linux
- Docker

### Install

```bash
$ git clone git@github.com:hexlet-codebattle/codebattle.git
$ cd codebattle
$ make setup
```

### Start Server

```bash
$ make compose
```

- Open <http://localhost:4000>

### Run Tests

```bash
$ make compose-test
```

### Lint

```bash
$ make compose-lint

# To run specific
$ make compose-mix-format
$ make compose-mix-credo
$ make compose-lint-js-fix
```

### Useful

```bash
$ mix upload_langs

$ mix images.push # all
$ mix images.push elixir

$ mix images.build # all
$ mix images.build elixir

$ mix images.pull # all
$ mix images.pull elixir

#If you use images in dev env, run commands in make compose-bash
```

### Profile js bundle

### Support

- [https://t.me/hexletcommunity](https://t.me/hexletcommunity/5) channel: codebattle


### Troubleshooting

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

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=hexlet-codebattle/codebattle&type=Date)](https://star-history.com/#hexlet-codebattle/codebattle&Date)

---

[![Hexlet Ltd. logo](https://raw.githubusercontent.com/Hexlet/assets/master/images/hexlet_logo128.png)](https://hexlet.io?utm_source=github&utm_medium=link&utm_campaign=codebattle)

This repository is created and maintained by the team and the community of Hexlet, an educational project. [Read more about Hexlet](https://hexlet.io?utm_source=github&utm_medium=link&utm_campaign=codebattle).

See most active contributors on [hexlet-friends](https://friends.hexlet.io/).
