import React from 'react';
import Gon from 'gon';

const Participants = tournament => {
  const { tournament: { data: { players }, creatorId } } = tournament;
  const currentUser = Gon.getAsset('current_user');
  const { id } = currentUser;
  const isCurrentUserParticipant = players.find(item => item.id === id);

  const renderJoinButton = () => {
     if (isCurrentUserParticipant) {
            return (
              <button type="button" className="btn btn-outline-danger">Leave</button>
            );
          }
            return (
              <button type="button" className="btn btn-outline-secondary">
                Join
              </button>
            );
  };

  const renderPlayer = player => (
    <>
      <div className="d-flex align-items-center">
        <a className="d-inline-flex.align-items-center" href={`/users/${player.id}`}>
          <img
            className="attachment rounded border mr-1 cb-user-avatar"
            src={`https://avatars0.githubusercontent.com/u/${player.githubId}`}
            alt={player.name}
          />
          <span className="mr-1 text-truncate" style={{ maxWidth: '130px' }}>{player.name}</span>
        </a>
        <small className="mr-1">{player.rating}</small>
      </div>
      {creatorId === id && tournament.tournament.state === 'waiting_participants' && (
        <button type="button" className="btn btn-outline-danger">
          Kick
        </button>
      )}
    </>
  );

  return (
    <div className="container mt-2 bg-white shadow-sm p-2">
      <div className="d-flex align-items-center flex-wrap justify-content-start">
        <h5 className="mb-2 mr-5">Participants</h5>
        {tournament.tournament.state === 'waiting_participants' && renderJoinButton()}
      </div>
      <div className="my-3">
        {players.map(player => (
          <div className="my-3 d-flex" key={player.id}>
            <div className="d-flex align-items-center">
              {renderPlayer(player)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Participants;
