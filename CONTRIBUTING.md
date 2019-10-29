# Участие в проекте

Спасибо за интерес к нашему проекту!
Вне зависимости от уровня вашей подготовки, знания языков и вероисповедания, мы приглашаем вас поучаствовать в развитии проекта. В кодбатле много различных направлений по разработке, и в каждый из них нужны руки. Есть несколько способов помочь нам.

## Указать на баг или неточность

Перед тем как сообщить о какой-либо ошибке, проверьте, не сообщили ли о ней ранее в [issue-трекере.](https://github.com/hexlet-codebattle/codebattle/issues)

## Взяться за выполнение задачи

На нашем [issue-трекере](https://github.com/hexlet-codebattle/codebattle/issues) вы можете выбрать интересующую вас задачу и взяться за ее выполнение. Перед этим желательно согласовать свои действия с другими участниками, описав свой план действий и оповестив их о том, что приступили к работе. Если кто-то уже взялся за выполнение задачи, то вы все равно можете начать выполнять ее, а лучше всего скооперироваться с теми, кто ее уже выполняет.

Задачи, соотвествующие текущему этапу разработки, находятся [в данном разделе](https://github.com/hexlet-codebattle/codebattle/milestones), а на [данной доске](https://github.com/hexlet-codebattle/codebattle/projects/1) вы можете увидеть все наиболее актуальные задачи, включая соответствующие текущему этапу и не зависящие от него. Если вы решили взять задачу, которая есть на доске и находится в статусе "Ready", отличным решением будет переместить её в статус "Doing", а по завершении - в статус "Done". Это упростит разработку и вам, и другим разработчикам.

Если вы не можете подобрать себе задачу, но очень хотите поучаствовать, то обратитесь за помощью в [слаке](https://hexlet-ru.slack.com/messages/C09FRNPC4) Хекслета. Предварительно нужно зарегистрироваться пройдя по [ссылке](http://slack-ru.hexlet.io).

В качестве подготовки к проекту рекомендуем ознакомится с материалами по [ссылке.](https://github.com/hexlet-codebattle/codebattle/wiki/%D0%9F%D0%BE%D0%B4%D0%B3%D0%BE%D1%82%D0%BE%D0%B2%D0%BA%D0%B0-%D0%BA-%D1%83%D1%87%D0%B0%D1%81%D1%82%D0%B8%D1%8E-%D0%B2-%D0%BF%D1%80%D0%BE%D0%B5%D0%BA%D1%82%D0%B5-(%D1%80%D0%B5%D0%BA%D0%BE%D0%BC%D0%B5%D0%BD%D0%B4%D1%83%D0%B5%D0%BC%D0%BE%D0%B5))

## Разработка

1. Ознакомьтесь с [принципами разработки](https://github.com/hexlet-codebattle/codebattle/wiki/%D0%9F%D1%80%D0%B8%D0%BD%D1%86%D0%B8%D0%BF%D1%8B-%D1%80%D0%B0%D0%B7%D1%80%D0%B0%D0%B1%D0%BE%D1%82%D0%BA%D0%B8) принятыми в этом проекте.

1. Сделайте fork проекта (кнопка fork в правом верхнем углу на странице <https://github.com/hexlet-codebattle/codebattle>) и клонируйте репозиторий:

    ```bash
    git clone https://github.com/%your-username%/codebattle.git
    ```

1. Следуйте [инструкциям по установке](https://github.com/hexlet-codebattle/codebattle/blob/master/README.md#install).

1. Перед тем как начать писать код, необходимо создать ветку для разработки из ветки `master`. Важно учитывать, что в одной ветке может находиться решение только одной задачи!

    ```bash
    git checkout master
    git checkout -b %your_branch_name%
    ```

1. После выполнения задачи коммитите изменения (текст коммита на английском) и отправляете в удаленный репозиторий.

    ```bash
    git add . && git commit -m "%useful_commit_message%"
    git push --set-upstream origin %your_branch_name%
    ```

1. Создайте `pull request`.

## Создание pull request

Чтобы создать PR, необходимо:

* Убедиться, что все тесты выполняются успешно и линтер не выдает ошибок
* Зайти на [основной репозиторий](https://github.com/hexlet-codebattle/codebattle)
* Скорее всего гитхаб сам предложит вам создать PR, тем не менее, стоит заглянуть [сюда](https://help.github.com/articles/creating-a-pull-request)
* Не забываем в комментарии к PR [ссылаться на issue](https://help.github.com/articles/closing-issues-using-keywords)

После завершения работы над задачей не забудьте [синхронизировать ваш fork с основным репозиторием](https://help.github.com/articles/syncing-a-fork/).

```bash
    git fetch upstream
    git checkout master
    git merge upstream/master
```

[Подробные инструкции по работе с PR](https://help.github.com/categories/collaborating-with-issues-and-pull-requests)

### Спасибо за помощь `!`
