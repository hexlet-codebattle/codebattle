import React from 'react';

const DropdownMenuDefault = ({ renderLevel }) => {
  const orderedLevels = ['elementary', 'easy', 'medium', 'hard'];
  return (
    <>
      <div className="dropdown-header">Select a difficulty</div>
      <div className="dropdown-divider" />
      {orderedLevels.map(renderLevel)}
    </>
  );
};

export default DropdownMenuDefault;
