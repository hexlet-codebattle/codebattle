[![Build Status](https://travis-ci.org/hexlet-codebattle/codebattle.svg?branch=master)](https://travis-ci.org/hexlet-codebattle/codebattle)

# Codebattle
Кодбатл это игра с открытым исходным кодом, которая разрабатывается сообществом хекслета. Подробнее о проекте читайте в [вики репозитория](https://github.com/hexlet-codebattle/codebattle/wiki). Мы будем очень рады если решите [принять участие в разработке проекта.](https://github.com/hexlet-codebattle/codebattle/blob/master/CONTRIBUTING.md)
Текущая версия приложения доступна по адресу http://hexlet-codebattle.herokuapp.com.
Следить за процессом разработки можно в [ленте новостей.](https://github.com/hexlet-codebattle/codebattle/wiki/News-Feed)

Когда вы будете полностью готовы влиться в разработку, то можете выбрать любую интересную для себя задачу исходя из текущего этапа [в этом разделе](https://github.com/hexlet-codebattle/codebattle/milestones) или посмотреть все открытые актуальные задачи [на этой доске](https://github.com/hexlet-codebattle/codebattle/projects/1).

# Разработка

* Клонируйте репозиторий

```bash
git clone https://github.com/hexlet-codebattle/codebattle.git
```

Далее все приведенные команды необходимо делать в консоли в **текущей директории проекта**.

## Настроить рабочие окружение

Требования: 

* `docker >= 17.06` [*Download Docker CE*](https://www.docker.com/community-edition#/download);
* `docker-compose >= 1.15` [*Install Docker Compose*](https://docs.docker.com/compose/install/);

### Автоматическая настройка окружения 

#### Debian GNU/Linux

```
make debian-setup
```

* Выйдите и войдите в систему

### Запустить приложение

Для использования GitHub OAuth авторизации необходимо создать `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` и указать их в файле `.env`.

> [Register a new OAuth application](https://github.com/settings/applications/new)
>
> **Homepage URL:** http://localhost:4000
>
> **Authorization callback URL:** http://localhost:4000/auth/github/callback

* Вставьте свои переменные окружения в файле `.env`, [подробнее - пункт 6](https://github.com/hexlet-codebattle/codebattle/wiki/Установка-и-тестирование-проекта)

```bash
cp .env.example .env
```

* Установите зависимости и запустите docker-контейнеры

```bash
make compose-setup
make compose
```

* Откройте http://localhost:4000 в браузере

### Дополнительно

Если у вас возникли проблемы с установкой или после неё, воспользуйтесь [подробной инструкцией по установке и тестированию](https://github.com/hexlet-codebattle/codebattle/wiki/%D0%A3%D1%81%D1%82%D0%B0%D0%BD%D0%BE%D0%B2%D0%BA%D0%B0-%D0%B8-%D1%82%D0%B5%D1%81%D1%82%D0%B8%D1%80%D0%BE%D0%B2%D0%B0%D0%BD%D0%B8%D0%B5-%D0%BF%D1%80%D0%BE%D0%B5%D0%BA%D1%82%D0%B0).

Также вы можете увидеть процесс полной [установки](https://asciinema.org/a/n7LkXM2zSfGWSGsQcw2gLLLgh) и [тестирования](https://asciinema.org/a/DmZNw6NvZdLxLDXsnx67nEmbT) на видео.

Пересобрать образ рабочего окружения:

```bash
make compose-rebuild-runtime
```

Пересобрать приложение:

```bash
make compose-rebuild-app
```

Пересобрать все:

```bash
make compose-rebuild-all
```

Запуск тестов:

```bash
make compose-test
```

Отчет о покрытии тестами:

```bash
make compose-test-coverage-html
```

Проверка синтаксиса:

```bash
make compose-lint
```

Консоль окружения:

```bash
make compose-bash
``````

Интерактивная консоль `Elixir`:

```bash
make compose-console
```
