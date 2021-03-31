import React from "react";
import { Modal, Button } from "react-bootstrap";

const Tutorial = () => {
  const [show, setShow] = React.useState(false);

  const handleShow = () => setShow(true);
  const handleClose = () => setShow(false);
  return (
    <>
      <Button
        variant="link"
        className="text-uppercase rounded-0 text-black font-weight-bold p-3"
        onClick={handleShow}
      >
        Tutorial
      </Button>

      <Modal show={show} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>Инструкция</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Для создания новой игры нажмите кнопку Fight с желаемым уровнем
          сложности. После загрузки перед вами появится интерфейс текущей игры с
          таймером на 60 минут. С левой стороны ваша рабочая область, справа -
          вашего противника. Поле Task показывает текст задания с примером
          выполнения. Output - показывает вывод тестов после обработки решения
          пользователя. Ниже располагается Редактор кода. В нем вы можете
          выбрать язык, на котором вы будете выполнять поставленную задачу,
          цветовую тему редактора и кнопки навигации: красный флаг заканчивает
          текущую игру и отправляет вас в Лобби, стрелки сбрасывают результат
          выполнения задания, зеленая стрелка запускает проверку. Для просмотра
          результатов перейдите на вкладку output. Побеждает тот игрок, у кого
          вывод тестов будет без ошибок.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default Tutorial;
