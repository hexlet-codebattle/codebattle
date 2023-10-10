import React, { useState } from 'react';

const { createFilter } = jest.requireActual('react-select');

const Select = ({ options, onChange, filterOption }) => {
  const [selectInput, setSelectInput] = useState('task');

  return (
    <div>
      {options
        .filter(({ name }) => (filterOption({ data: { name } }, selectInput)))
        .map(option => (
          <button
            type="button"
            onClick={() => onChange(option)}
            key={option.name}
          >
            {option.name}
          </button>
      ))}
      <button
        type="button"
        onClick={() => setSelectInput('nAme')}
        key="filterOption"
      >
        filter tasks by name
      </button>
    </div>
  );
};

export { createFilter };
export default Select;
