import React, { useEffect, useState } from 'react';

import { useDispatch, useSelector } from 'react-redux';
import Gon from 'gon';

import { connectToTournament, requestMatchesForRound} from '../../middlewares/TournamentAdmin';
import * as selectors from '../../selectors';
import { pushActiveMatchToStream } from '../../middlewares/TournamentAdmin';

// Define CSS for active game animation
const activeGameStyles = `
  @keyframes pulse {
    0% { box-shadow: 0 0 0 0 rgba(255, 193, 7, 0.7); }
    70% { box-shadow: 0 0 0 10px rgba(255, 193, 7, 0); }
    100% { box-shadow: 0 0 0 0 rgba(255, 193, 7, 0); }
  }
  
  .active-game {
    position: relative;
    animation: pulse 1.5s infinite;
    border: 2px solid #ffc107 !important;
  }
  
  .active-game-indicator {
    display: inline-block;
    margin-left: 3px;
    animation: rotate 1.5s linear infinite;
  }
  
  @keyframes rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

function TournamentAdminWidget() {
  // Add style element for animations
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = activeGameStyles;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);
  const tournamentId = Gon.getAsset('tournament_id');
  const dispatch = useDispatch();
  
  const tournament = useSelector(selectors.tournamentSelector);
  const tournamentAdmin = useSelector(selectors.tournamentAdminSelector);
  const [playerMatches, setPlayerMatches] = useState({});

  useEffect(() => {
    dispatch(connectToTournament(null, tournamentId, true));
  }, [dispatch]);

  useEffect(() => {
    if (tournament?.currentRoundPosition) {
      dispatch(requestMatchesForRound());
    }
  }, [dispatch, tournament?.currentRoundPosition]);

  // Group matches by player ID when matches data changes
  useEffect(() => {
    if (tournament?.matches && Object.keys(tournament.matches).length > 0) {
      const matchesByPlayer = {};
      
      Object.values(tournament.matches).forEach(match => {
        if (match.playerIds && match.playerIds.length > 0) {
          match.playerIds.forEach(playerId => {
            if (!matchesByPlayer[playerId]) {
              matchesByPlayer[playerId] = [];
            }
            matchesByPlayer[playerId].push(match);
          });
        }
      });
      
      setPlayerMatches(matchesByPlayer);
    }
  }, [tournament?.matches]);

  const renderRankingTable = () => {
    if (!tournament?.ranking?.entries || tournament.ranking.entries.length === 0) {
      return <div className="text-center mt-3">No ranking data available</div>;
    }

    return (
      <div className="ranking-table-container">
        <table className="table table-striped table-sm">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Name</th>
              <th scope="col">Clan</th>
              <th scope="col">Score</th>
              <th scope="col">Matches</th>
            </tr>
          </thead>
          <tbody>
            {tournament.ranking.entries.map((player) => (
              <tr key={player.id}>
                <td>{player.place}</td>
                <td>{player.name}</td>
                <td>{player.clan || '-'}</td>
                <td>{player.score}</td>
                <td>
                  {renderPlayerMatchButtons(player.id)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="text-muted small text-center">
          Page {tournament.ranking.pageNumber} of {Math.ceil(tournament.ranking.totalEntries / tournament.ranking.pageSize)}
          • Total players: {tournament.ranking.totalEntries}
        </div>
      </div>
    );
  };

  // Render match buttons for a specific player
  const renderPlayerMatchButtons = (playerId) => {
    const allMatches = playerMatches[playerId] || [];
    
    if (allMatches.length === 0) {
      return <span className="text-muted">No matches</span>;
    }
    
    
    return (
      <div className="d-flex flex-wrap gap-1">
        {allMatches.map(match => {
          // Determine button color based on match state
          let buttonClass = 'btn-outline-secondary';
          if (match.state === 'finished') {
            buttonClass = match.winnerId === playerId ? 'btn-success' : 'btn-danger';
          } else if (match.state === 'playing') {
            buttonClass = 'btn-primary';
          } else if (match.state === 'timeout') {
            buttonClass = 'btn-warning';
          }
          
          // Check if this is the active game
          const isActiveGame = tournamentAdmin.activeGameId && match.gameId === tournamentAdmin.activeGameId;
          // No need for inline styles as we're using CSS animations
          const buttonStyle = {};
          
          return (
            <button 
              key={match.id} 
              onClick={() => dispatch(pushActiveMatchToStream(match.gameId))}
              className={`btn ${buttonClass} btn-sm me-1 mb-1 ${isActiveGame ? 'active-game' : ''}`}
              title={`${isActiveGame ? '⭐ ACTIVE GAME - ' : ''}Match ID: ${match.id}, State: ${match.state}, Started: ${new Date(match.startedAt).toLocaleTimeString()}`}
              style={buttonStyle}
            >
              #{match.gameId}{isActiveGame ? <span className="active-game-indicator">🔄</span> : ''}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <h1 className="text-center">Tournament Admin Widget</h1>
          <h2 className="text-center">Tournament Name: {tournament?.name}</h2>
          
          <div className="card shadow-sm mt-4">
            <div className="card-header bg-primary text-white">
              <h4 className="mb-0">Player Rankings & Matches</h4>
            </div>
            <div className="card-body">
              {renderRankingTable()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TournamentAdminWidget;
