/* eslint-disable */
import React, { memo, useState } from 'react';

import TournamentStates from '../../config/tournament';
import UserInfo from '../../components/UserInfo';
import JoinButton from './JoinButton';

const isParticipant = () => {

};

const TeamTournamentInfoPanel = ({
 state, players, matches, statistics, currentUserId,
}) => {
    const [scoreTeam1, scoreTeam2] = getTeamScores(matches);

    return (
      <>
        <ul className="nav nav-tabs" id="team-tournament-tab" role="tablist">
          <li className="nav-item">
            <a href="#scores" className="nav-link border-0 bg-white text-dark active" id="scores-tab" data-toggle="tab" role="tab" aria-controls="scores" aria-selected="true">
              Team scores
            </a>
          </li>
          <li className="nav-item">
            <a href="#rating" className="nav-link border-0 bg-white text-dark" id="rating-tab" data-toggle="tab" role="tab" aria-controls="rating" aria-selected="false">
              Rating players
            </a>
          </li>
          <li className="nav-item">
            <a href="#statistics" className={`nav-link border-0 bg-white text-dark ${statistics ? '' : 'disabled'}`} id="statistics-tab" data-toggle="tab" role="tab" aria-controls="statistics" aria-selected="false">
              Tournament Statistics
            </a>
          </li>
        </ul>
        <div className="tab-content" id="tournament_content">
          <div className="tab-pane fade show active" id="scores" role="tabpanel" aria-labelledby="scores-tab">
            <div className="py-2 bg-white shadow-sm rounded">
              <div className="row align-items-center">
                <div className="col-4">
                  <h3 className="mb-0 px-3 font-weight-light">{getTeamNames(tournament)[0]}</h3>
                </div>
                <div className="col-2 text-right">
                  <span className="display-4">{getTeamScore(tournament)[0]}</span>
                </div>
                <div className="col-2 text-right">
                  <span className="display-4">{getTeamScore(tournament)[1]}</span>
                </div>
                <div className="col-4 text-right">
                  <h3 className="mb-0 px-3 font-weight-light">{getTeamNames(tournament)[1]}</h3>
                </div>
              </div>
            </div>
            <div className="row px-3 pt-2">
              {getTeams(tournament).map(team => (
                <div className="col">
                  <div className="d-flex align-items-center">
                    <JoinButton
                      isShow={TournamentStates.waitingParticipants === state}
                      isParticipant={isParticipant(team.players, currentUserId, team.id)}
                      teamId={teamId}
                    />
                  </div>
                  <div className="my-3">
                    {
                            team.players.length === 0 ? <p>NO_PARTICIPANTS_YET</p> : (
                                team.players.map(player => (
                                  <div className="my-3 d-flex">
                                    <UserInfo user={player} hideOnlineIndicator />
                                    {currentUserId === creatorId && currentUserId !== player.id && <button className="btn btn-outline-danger">Kick</button> }
                                  </div>
                                ))
                            )
                        }
                  </div>
                </div>
                ))}
            </div>
          </div>
          <div className="tab-pane fade" id="scores" role="tabpanel" aria-labelledby="rating-tab" />
          <div className="tab-pane fade" id="scores" role="tabpanel" aria-labelledby="statistics-tab" />
        </div>
      </>
);
};

export default memo(TeamTournamentInfoPanel);
