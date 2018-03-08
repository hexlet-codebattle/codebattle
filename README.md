# Codebattle

[![Build Status](https://travis-ci.org/hexlet-codebattle/codebattle.svg?branch=master)](https://travis-ci.org/hexlet-codebattle/codebattle)

Кодбатл это игра с открытым исходным кодом, которая разрабатывается сообществом хекслета. Подробнее о проекте читайте в [вики репозитория](https://github.com/hexlet-codebattle/codebattle/wiki). Мы будем очень рады если решите [принять участие в разработке проекта.](https://github.com/hexlet-codebattle/codebattle/blob/master/CONTRIBUTING.md)
Текущая версия приложения доступна по адресу [codebattle.hexlet.io](http://codebattle.hexlet.io).
Следить за процессом разработки можно в [ленте новостей.](https://github.com/hexlet-codebattle/codebattle/wiki/News-Feed)

### Requirements

* Mac / Linux
* Docker
* Docker Compose
* Ansible (installed using pip3)

### Install

* Clone repo

```bash
$ git clone https://github.com/hexlet-codebattle/codebattle.git
```

[Inatall ansible](http://docs.ansible.com/ansible/latest/intro_installation.html)

```bash
$ cd codebattle
$ make ansible-development-setup
$ make compose-setup
```

### Run

```bash
$ make compose
```

* Open <http://localhost:4000>

### Test

```bash
$ make compose-test
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

#If you use docker in dev env, run commands in make compose-bash
```

### Support
* <https://hexlet-ru.slack.com> channel: codebattle
