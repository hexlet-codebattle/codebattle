import React from 'react';
import { useSelector } from 'react-redux';
import GameRoomModes from '../../config/gameModes';
import * as selectors from '../../selectors';
import StartTrainingButton from './StartTrainingButton';
import SignUpButton from './SignUpButton';
import RematchButton from './RematchButton';

function ActionsAfterGame() {
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

  if (gameMode === GameRoomModes.tournament) {
    return <></>;
  }

  return (
    <>
      <RematchButton disabled={isRematchDisabled} />
    </>
  );
}

export default ActionsAfterGame;
