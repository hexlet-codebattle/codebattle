import React from 'react';
import { useSelector } from 'react-redux';
import GameTypeCodes from '../../config/gameTypeCodes';
import * as selectors from '../../selectors';
import BackToTournamentButton from './BackToTournamentButton';
import NewGameButton from './NewGameButton';
import StartTrainingButton from './StartTrainingButton';
import SignUpButton from './SignUpButton';
import RematchButton from './RematchButton';
import BackToHomeButton from './BackToHomeButton';

const ActionsAfterGame = () => {
  const gameType = useSelector(selectors.gameTypeSelector);
  const isOpponentInGame = useSelector(selectors.isOpponentInGameSelector);

  const isRematchDisabled = !isOpponentInGame;

  if (gameType === GameTypeCodes.training) {
    return (
      <>
        <StartTrainingButton />
        <SignUpButton />
        <BackToHomeButton />
      </>
    );
  }

  if (gameType === GameTypeCodes.tournament) {
    return (
      <>
        <BackToTournamentButton />
        <BackToHomeButton />
      </>
    );
  }

  if (gameType === GameTypeCodes.bot) {
    return (
      <>
        <RematchButton disabled={isRematchDisabled} />
        <BackToHomeButton />
      </>
    );
  }

  return (
    <>
      <NewGameButton type={gameType} />
      <RematchButton disabled={isRematchDisabled} />
      <BackToHomeButton />
    </>
  );
};

export default ActionsAfterGame;
