import React from 'react';
import { useSelector } from 'react-redux';
import GameTypeCodes from '../../config/gameTypeCodes';
import * as selectors from '../../selectors';
import NewGameButton from './NewGameButton';
import StartTrainingButton from './StartTrainingButton';
import SignUpButton from './SignUpButton';
import RematchButton from './RematchButton';

const ActionsAfterGame = () => {
  const gameType = useSelector(selectors.gameTypeSelector);
  const isOpponentInGame = useSelector(selectors.isOpponentInGameSelector);

  const isRematchDisabled = !isOpponentInGame;

  if (gameType === GameTypeCodes.training) {
    return (
      <>
        <StartTrainingButton />
        <SignUpButton />
      </>
    );
  }
  if (gameType === GameTypeCodes.bot) {
    return (
      <>
        <RematchButton disabled={isRematchDisabled} />
      </>
    );
  }
  if (gameType === GameTypeCodes.tournament) {
    return <></>;
  }
  return (
    <>
      <NewGameButton type={gameType} />
      <RematchButton disabled={isRematchDisabled} />
    </>
  );
};

export default ActionsAfterGame;
