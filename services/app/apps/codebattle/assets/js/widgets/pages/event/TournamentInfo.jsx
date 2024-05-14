import React from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import i18next from 'i18next';

import TournamentStatus from './TournamentStatus';

const TournamentInfo = ({
  id,
  type,
  name = i18next.t('Stage %{name}', { name: 1 }),
  nameClassName = '',
  data = '##.##',
  time = '##:##',
  handleOpenInstruction = () => { },
}) => (
  <div className="d-flex flex-column flex-lg-row align-items-center py-2 cb-custom-event-tournaments-item cb-overflow-x-auto">
    <div className="d-flex">
      <span className={`${nameClassName} mx-3 font-weight-bold text-nowrap`}>
        {name}
      </span>
      <span className="align-content-center">
        <TournamentStatus
          type={type}
        />
      </span>
    </div>
    <div className="d-flex ml-2">
      {id ? (
        <>
          <span className="mx-1 align-content-center cursor-pointer">
            <FontAwesomeIcon
              icon="info-circle"
              className="text-primary"
              onClick={handleOpenInstruction}
            />
          </span>
          <span className="mx-1 align-content-center cursor-pointer">
            <a href={`/tournaments/${id}`}>
              <FontAwesomeIcon icon="link" />
            </a>
          </span>
        </>
      ) : (
        <span>{data}</span>
      )}

      <span className="mx-3 text-nowrap">{time}</span>
    </div>
  </div>
);

export default TournamentInfo;
