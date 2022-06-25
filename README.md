# Codebattle

[![Actions Status](https://github.com/hexlet-codebattle/codebattle/workflows/Build%20master/badge.svg)](https://github.com/hexlet-codebattle/codebattle/actions)
[![codecov](https://codecov.io/gh/hexlet-codebattle/codebattle/branch/master/graph/badge.svg)](https://codecov.io/gh/hexlet-codebattle/codebattle)
[![Maintainability](https://api.codeclimate.com/v1/badges/a99a88d28ad37a79dbf6/maintainability)](https://codeclimate.com/github/hexlet-codebattle/codebattle/maintainability)
[![codebeat badge](https://codebeat.co/badges/7557979e-74a7-45a6-b9ab-dcd44bab7e5b)](https://codebeat.co/projects/github-com-hexlet-codebattle-codebattle-master)

Codebattle - is an open source game being developed by the Hexlet community.
The current version of the application is available at [codebattle.hexlet.io](https://codebattle.hexlet.io).
We also have [chrome extension](https://chrome.google.com/webstore/detail/codebattle-web-extension/embfhnfkfobkdohleknckodkmhgmpdli). Which allow to subscribe on last game updates.
### Requirements

- Mac / Linux
- docker
- docker-compose

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

$ mix dockers.push # all
$ mix dockers.push elixir

$ mix dockers.build # all
$ mix dockers.build elixir

$ mix dockers.pull # all
$ mix dockers.pull elixir

$ mix issues.upload # Upsert issues by name in db

#If you use docker in dev env, run commands in make compose-bash
```

### Profile js bundle
To build stat.json and see details in browser run:
```
yarn profile:build
yarn profile:visualize
```

### Support

- <https://hexlet-ru.slack.com> channel: codebattle


### Troubleshooting

- Install and run docker

Make sure you have installed `docker` and `docker-compose` for your OS.

https://docs.docker.com/install/

https://docs.docker.com/compose/install/

Make sure your docker daemon is running. You can run it manually by typing:

```
sudo dockerd
```

or you can add it to startup by typing:

```
sudo systemctl enable docker
```

Close and open your terminal if docker daemon didn't start immediately.

- Manage Docker as a non-root user

https://docs.docker.com/install/linux/linux-postinstall/

Create the docker group.

```
sudo groupadd docker
```

Add your user to the docker group.

```
sudo usermod -aG docker $USER
```

---

[![Hexlet Ltd. logo](https://raw.githubusercontent.com/Hexlet/assets/master/images/hexlet_logo128.png)](https://hexlet.io?utm_source=github&utm_medium=link&utm_campaign=codebattle)

This repository is created and maintained by the team and the community of Hexlet, an educational project. [Read more about Hexlet](https://hexlet.io?utm_source=github&utm_medium=link&utm_campaign=codebattle).

See most active contributors on [hexlet-friends](https://friends.hexlet.io/).
