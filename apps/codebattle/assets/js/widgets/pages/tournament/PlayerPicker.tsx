import React, { useMemo } from 'react';

import { Button } from '@mantine/core';
import Select, { type StylesConfig } from 'react-select';

import { type Player } from '@/slices/initial';

import UserInfo from '../../components/UserInfo';

const customStyle: StylesConfig = {
  control: (provided) => ({
    ...provided,
    height: '33px',
    minHeight: '31px',
    minWidth: '210px',
    borderRadius: 'unset',
    backgroundColor: 'hsl(0, 0%, 100%)',
  }),
  indicatorsContainer: (provided) => ({
    ...provided,
    height: '29px',
  }),
  clearIndicator: (provided) => ({
    ...provided,
    padding: '5px',
  }),
  dropdownIndicator: (provided) => ({
    ...provided,
    padding: '5px',
  }),
  input: (provided) => ({
    ...provided,
    height: '21px',
  }),
};

interface PlayerPickerProps {
  players: Player[];
  activePlayer: Player;
  changePlayer: (...args: unknown[]) => void;
  isDisabled?: boolean;
}

function PlayerPicker({ players, activePlayer, changePlayer, isDisabled }: PlayerPickerProps) {
  const options = useMemo(
    () =>
      players
        .filter((player) => player.id !== activePlayer.id)
        .map((player) => ({
          label: <UserInfo user={player} truncate />,
          value: player.id,
        })),
    [players, activePlayer],
  );
  const defaultValue = useMemo(
    () => ({ label: <UserInfo user={activePlayer} truncate /> }),
    [activePlayer],
  );

  if (isDisabled) {
    return (
      <Button size="xs" variant="subtle" disabled>
        <UserInfo user={activePlayer} truncate />
      </Button>
    );
  }

  return (
    <Select
      styles={customStyle}
      defaultValue={defaultValue}
      onChange={changePlayer}
      options={options}
    />
  );
}

export default PlayerPicker;
