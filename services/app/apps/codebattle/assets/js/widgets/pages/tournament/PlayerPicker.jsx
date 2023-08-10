import React, { useMemo } from 'react';
import Select from 'react-select';
import UserInfo from '../../components/UserInfo';

const customStyle = {
  control: provided => ({
    ...provided,
    height: '33px',
    minHeight: '31px',
    minWidth: '210px',
    borderRadius: 'unset',
    backgroundColor: 'hsl(0, 0%, 100%)',
  }),
  indicatorsContainer: provided => ({
    ...provided,
    height: '29px',
  }),
  clearIndicator: provided => ({
    ...provided,
    padding: '5px',
  }),
  dropdownIndicator: provided => ({
    ...provided,
    padding: '5px',
  }),
  input: provided => ({
    ...provided,
    height: '21px',
  }),
};

function PlayerPicker({
 players, activePlayer, changePlayer, isDisabled,
}) {
  const options = useMemo(
    () => players
        .filter(player => player.id !== activePlayer.id)
        .map(player => ({
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
      <button className="btn btn-sm" type="button" disabled>
        <UserInfo user={activePlayer} truncate />
      </button>
    );
  }

  return (
    <>
      <Select
        styles={customStyle}
        defaultValue={defaultValue}
        onChange={changePlayer}
        options={options}
      />
    </>
  );
}

export default PlayerPicker;
