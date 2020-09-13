**Q**: Как обновить контейнер сервиса языка?
A: 
```sh
// Внутри контейнера приложения (app)
$ mix dockers.build <lang> // например php 
// Либо снаружи на хосте
$ docker-compose run app mix dockers.build lang="<lang>" 
```
