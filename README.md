# Codebattle

[![Actions Status](https://github.com/hexlet-codebattle/codebattle/workflows/Build%20master/badge.svg)](https://github.com/hexlet-codebattle/codebattle/actions)
[![codecov](https://codecov.io/gh/hexlet-codebattle/codebattle/branch/master/graph/badge.svg)](https://codecov.io/gh/hexlet-codebattle/codebattle)
[![Maintainability](https://api.codeclimate.com/v1/badges/a99a88d28ad37a79dbf6/maintainability)](https://codeclimate.com/github/hexlet-codebattle/codebattle/maintainability)

Кодбатл - это игра с открытым исходным кодом, которая разрабатывается сообществом Хекслета. Подробнее о проекте читайте в [вики репозитория](https://github.com/hexlet-codebattle/codebattle/wiki). Мы будем очень рады, если вы решите [принять участие в разработке проекта](https://github.com/hexlet-codebattle/codebattle/blob/master/CONTRIBUTING.md).
Текущая версия приложения доступна по адресу [codebattle.hexlet.io](https://codebattle.hexlet.io).
Следить за процессом разработки можно в [ленте новостей](https://github.com/hexlet-codebattle/codebattle/wiki/News-Feed).

### Requirements

- Mac / Linux
- Docker
- Docker Compose

### Install

- Clone repo

```bash
$ git clone https://github.com/hexlet-codebattle/codebattle.git
$ cd codebattle
$ mkdir -p tmp
$ echo 'asdf' > tmp/ansible-vault-password
$ make setup-env
$ make compose-setup
```

### Run

```bash
$ make compose
```

- Open <http://localhost:4000>

### Test

```bash
$ make compose-test
```

### Lint

```bash
$ make compose-bash
$ make lint-js

# To autofix warnings run:
$ make lint-js-fix
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

$ mix test test/code_check/

$ mix issues.upload # Upsert issues by name in db

#If you use docker in dev env, run commands in make compose-bash
```

### Support

- <https://hexlet-ru.slack.com> channel: codebattle
