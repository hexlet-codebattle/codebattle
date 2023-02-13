import React from 'react';
import i18n from '../../i18n';
import levelToClass from '../config/levelToClass';

const DropdownItem = ({ level, setLevel, setLevelClass }) => (
  <button
    key={level}
    className="dropdown-item"
    type="button"
    onClick={() => {
      setLevel(level);
      setLevelClass(levelToClass[level]);
    }}
  >
    <span className={`badge badge-pill badge-${levelToClass[level]} mr-1`}>&nbsp;</span>
    {i18n.t(level)}
  </button>
);

const DropdownMenuDefault = ({ currentLevel, setLevel, setLevelClass }) => {
  const orderedLevels = ['random', 'elementary', 'easy', 'medium', 'hard'].filter(level => level !== currentLevel);

  return orderedLevels.map(level => (
    <DropdownItem
      key={level}
      level={level}
      setLevel={setLevel}
      setLevelClass={setLevelClass}
    />
  ));
};

export default DropdownMenuDefault;
