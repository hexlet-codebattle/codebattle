import React from 'react';
import { connect } from 'react-redux';
import * as selectors from '../../selectors';

const BackToTournamentButton = (props) => {
  const {
    gameStatus: { tournamentId },
  } = props;
  const tournamentUrl = `/tournaments/${tournamentId}`;

  return (
    <a className="btn btn-secondary btn-block" href={tournamentUrl}>
      Back to tournament
    </a>
  );
};

const mapStateToProps = state => ({
  gameStatus: selectors.gameStatusSelector(state),
});

export default connect(mapStateToProps)(BackToTournamentButton);
