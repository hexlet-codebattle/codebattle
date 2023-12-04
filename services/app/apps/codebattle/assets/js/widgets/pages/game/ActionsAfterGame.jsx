import React from 'react';

import { useSelector } from 'react-redux';

import GameRoomModes from '../../config/gameModes';
import * as selectors from '../../selectors';

import RematchButton from './RematchButton';
import SignUpButton from './SignUpButton';
import StartTrainingButton from './StartTrainingButton';

function ActionsAfterGame() {
  const { tournamentId } = useSelector(selectors.gameStatusSelector);
  const gameMode = useSelector(selectors.gameModeSelector);
  const isOpponentInGame = useSelector(selectors.isOpponentInGameSelector);

  const isRematchDisabled = !isOpponentInGame;

  if (gameMode === GameRoomModes.training) {
    return (
      <>
        <StartTrainingButton />
        <SignUpButton />
      </>
    );
  }

  if (gameMode === GameRoomModes.tournament || tournamentId) {
    return <></>;
  }

  return (
    <>
      <RematchButton disabled={isRematchDisabled} />
    </>
  );
}

export default ActionsAfterGame;
