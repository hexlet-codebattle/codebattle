import React from "react";

function InvitationPanel({ invite, requestInviteUpdates }) {
  return (
    <div className="container-fluid cb-main-wrapper py-5">
      <div className="container">
        <div className="text-center mb-5">
          <h1 className="display-4 font-weight-bold">Групповой турнир</h1>
        </div>

        <div className="row justify-content-center text-center my-5">
          <div className="col-md-3">
            <p className="small">Задание выполняется в <br /><strong>SourceCraft</strong></p>
          </div>
          <div className="col-md-3">
            <p className="small text-muted pt-2">30 минут на решение</p>
          </div>
        </div>

        <div className="row justify-content-center">
          <div className="col-lg-8">
            <h5 className="mb-4 font-weight-bold">Прежде чем начать:</h5>

            <ul className="list-group cb-steps-list">
              <li className="cb-bg-secondary list-group-item d-flex justify-content-between align-items-center cb-step-item">
                <div className="d-flex align-items-center">
                  <div className="d-flex flex-column">
                    <div>
                      <span className="cb-step-num mr-3">1</span>
                      <span>Создайте аккаунт в SourceCraft</span>
                    </div>
                    <div>
                      <small>(Регистрируясь под тем же Yandex Id, что и при регистрации на Баттле Вузов)</small>
                    </div>
                  </div>
                </div>
                <a
                  target="_blank"
                  href="https://sourcecraft.dev/"
                  className="btn btn-success cb-btn-action rounded"
                  rel="noopener noreferrer"
                >Создать аккаунт</a>
              </li>

              <li className="cb-bg-secondary list-group-item d-flex justify-content-between align-items-center cb-step-item mt-2">
                <div className="d-flex align-items-center">
                  <span className="cb-step-num mr-3">2</span>
                  <span>Присоединитесь к нашей организации в SourceCraft, чтобы получить задание</span>
                </div>
                <a
                  target="_blank"
                  href={invite.inviteLink}
                  className="btn btn-success cb-btn-action rounded"
                  rel="noopener noreferrer"
                >Получить приглашение</a>
              </li>

              <li className="cb-bg-secondary list-group-item d-flex justify-content-between align-items-center cb-step-item mt-2">
                <div className="d-flex align-items-center">
                  <span className="cb-step-num mr-3">3</span>
                  <span>По завершению всех шагов вы можете начать решать задачу</span>
                </div>
                <button className="btn btn-success cb-btn-action rounded" onClick={requestInviteUpdates}>К задаче</button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InvitationPanel;
