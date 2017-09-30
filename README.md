# Codebattle

[![Build Status](https://travis-ci.org/hexlet-codebattle/codebattle.svg?branch=master)](https://travis-ci.org/hexlet-codebattle/codebattle)

Кодбатл это игра с открытым исходным кодом, которая разрабатывается сообществом хекслета. Подробнее о проекте читайте в [вики репозитория](https://github.com/hexlet-codebattle/codebattle/wiki). Мы будем очень рады если решите [принять участие в разработке проекта.](https://github.com/hexlet-codebattle/codebattle/blob/master/CONTRIBUTING.md)
Текущая версия приложения доступна по адресу <http://hexlet-codebattle.herokuapp.com>.
Следить за процессом разработки можно в [ленте новостей.](https://github.com/hexlet-codebattle/codebattle/wiki/News-Feed)

Когда вы будете полностью готовы влиться в разработку, то можете выбрать любую интересную для себя задачу исходя из текущего этапа [в этом разделе](https://github.com/hexlet-codebattle/codebattle/milestones) или посмотреть все открытые актуальные задачи [на этой доске](https://github.com/hexlet-codebattle/codebattle/projects/1).

## Установка

* Клонируйте репозиторий

```bash
git clone https://github.com/hexlet-codebattle/codebattle.git
```

* Настройте окружение (для Linux)

```bash
cd codebattle
make development-build-local
```

* Выйдите и войдите в систему
* Установите зависимости и запустите docker-контейнеры

```bash
make compose-setup
make compose
```

* Вставьте свои переменные окружения в файле `.env`, [подробнее - пункт 6](https://github.com/hexlet-codebattle/codebattle/wiki/Установка-и-тестирование-проекта)
* Откройте <http://localhost:4000> в браузере
* Для запуска тестов введите

```bash
make compose-test
```

* Для создания отчета о покрытии тестами введите

```bash
make compose-test-coverage-html
```

Если у вас возникли проблемы с установкой или после неё, воспользуйтесь [подробной инструкцией по установке и тестированию](https://github.com/hexlet-codebattle/codebattle/wiki/%D0%A3%D1%81%D1%82%D0%B0%D0%BD%D0%BE%D0%B2%D0%BA%D0%B0-%D0%B8-%D1%82%D0%B5%D1%81%D1%82%D0%B8%D1%80%D0%BE%D0%B2%D0%B0%D0%BD%D0%B8%D0%B5-%D0%BF%D1%80%D0%BE%D0%B5%D0%BA%D1%82%D0%B0).

Также вы можете увидеть процесс полной [установки](https://asciinema.org/a/n7LkXM2zSfGWSGsQcw2gLLLgh) и [тестирования](https://asciinema.org/a/DmZNw6NvZdLxLDXsnx67nEmbT) на видео.
