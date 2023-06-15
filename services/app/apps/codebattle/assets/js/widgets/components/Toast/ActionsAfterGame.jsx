import React from 'react';
import { useSelector } from 'react-redux';
import GameModes from '../../config/gameModes';
import * as selectors from '../../selectors';
import StartTrainingButton from './StartTrainingButton';
import SignUpButton from './SignUpButton';
import RematchButton from './RematchButton';

const ActionsAfterGame = () => {
  const gameMode = useSelector(selectors.gameModeSelector);
  const isOpponentInGame = useSelector(selectors.isOpponentInGameSelector);

  const isRematchDisabled = !isOpponentInGame;

  if (gameMode === GameModes.training) {
    return (
      <>
        <StartTrainingButton />
        <SignUpButton />
      </>
    );
  }

  if (gameMode === GameModes.tournament) {
    return <></>;
  }

  return (
    <>
      <RematchButton disabled={isRematchDisabled} />
    </>
  );
};

export default ActionsAfterGame;
