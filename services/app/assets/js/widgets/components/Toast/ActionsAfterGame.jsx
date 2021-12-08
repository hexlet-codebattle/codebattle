import React from 'react';
import { useSelector } from 'react-redux';
import GameTypeCodes from '../../config/gameTypeCodes';
import * as selectors from '../../selectors';
import NewGameButton from './NewGameButton';
import StartTrainingButton from './StartTrainingButton';
import SignUpButton from './SignUpButton';
import RematchButton from './RematchButton';

const ActionsAfterGame = () => {
  const { tournamentId } = useSelector(selectors.gameStatusSelector);
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
  if (tournamentId) {
    return <></>;
  }
  if (gameType === GameTypeCodes.bot) {
    return (
      <>
        <RematchButton disabled={isRematchDisabled} />
      </>
    );
  }
  return (
    <>
      <NewGameButton type={gameType} />
      <RematchButton disabled={isRematchDisabled} />
    </>
  );
};

export default ActionsAfterGame;
