import React, { useMemo } from 'react';

import Select from 'react-select';

import UserInfo from '../../components/UserInfo';

const customStyle = {
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

function PlayerPicker({ activePlayer, changePlayer, isDisabled, players }) {
  const options = useMemo(
    () =>
      players
        .filter((player) => player.id !== activePlayer.id)
        .map((player) => ({
          label: <UserInfo truncate user={player} />,
          value: player.id,
        })),
    [players, activePlayer],
  );
  const defaultValue = useMemo(
    () => ({ label: <UserInfo truncate user={activePlayer} /> }),
    [activePlayer],
  );

  if (isDisabled) {
    return (
      <button disabled className="btn btn-sm" type="button">
        <UserInfo truncate user={activePlayer} />
      </button>
    );
  }

  return (
    <Select
      defaultValue={defaultValue}
      options={options}
      styles={customStyle}
      onChange={changePlayer}
    />
  );
}

export default PlayerPicker;
