import React from 'react';

import i18n from '../../i18n';
import levelToClass from '../config/levelToClass';

type Level = keyof typeof levelToClass;

interface DropdownItemProps {
  level: Level;
  setLevel: (level: Level) => void;
  setLevelClass: (levelClass: string) => void;
}

function DropdownItem({ level, setLevel, setLevelClass }: DropdownItemProps) {
  return (
    <button
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
}

interface DropdownMenuDefaultProps {
  currentLevel: Level;
  setLevel: (level: Level) => void;
  setLevelClass: (levelClass: string) => void;
}

const orderedLevels = Object.keys(levelToClass) as Level[];

const DropdownMenuDefault = ({ currentLevel, setLevel, setLevelClass }: DropdownMenuDefaultProps) =>
  orderedLevels
    .filter((level) => level !== currentLevel)
    .map((level) => (
      <DropdownItem key={level} level={level} setLevel={setLevel} setLevelClass={setLevelClass} />
    ));

export default DropdownMenuDefault;
