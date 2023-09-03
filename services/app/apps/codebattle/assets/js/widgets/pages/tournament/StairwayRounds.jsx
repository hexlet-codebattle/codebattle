import React from 'react';

import cn from 'classnames';

const StairwayRounds = ({
  players,
  activePlayerId,
  activeRoundId,
  setActiveRoundId,
}) => {
  const currentUser = players.find(player => player.id === activePlayerId);

  const renderRoundTabs = currentUser.tasks.map(({ roundId, status }) => {
    const isActiveRound = activeRoundId === roundId;

    const className = cn('btn flex-grow-1 text-dark', {
      'btn-outline-primary': isActiveRound,
      'btn-secondary': status === 'disabled',
      'btn-success': status === 'win',
      'btn-danger': status === 'lost',
      'btn-primary': status === 'active',
    });

    const onClick = isActiveRound || status === 'disabled'
        ? () => {}
        : () => setActiveRoundId(roundId);

    return (
      <React.Fragment key={roundId}>
        <div className="col d-flex px-0 m-2">
          <button
            type="button"
            className={className}
            disabled={status === 'disabled'}
            onClick={onClick}
          >
            {roundId}
          </button>
        </div>
      </React.Fragment>
    );
  });

  return (
    <>
      <div className="d-flex flex-row" style={{ background: '#ffffff' }}>
        <div className="col d-flex flex-grow-0 px-2 m-auto justify-content-center">
          Rounds:
        </div>
        {renderRoundTabs}
      </div>
    </>
  );
};

export default StairwayRounds;
