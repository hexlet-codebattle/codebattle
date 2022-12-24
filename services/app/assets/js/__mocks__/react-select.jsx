import React, { useState } from 'react';

const Select = ({ options, onChange, filterOption }) => {
  const [selectInput, setSelectInput] = useState('task');

  return (
    <div>
      {options
        .filter(option => (
          filterOption({ value: { name: option.value.name } }, selectInput)
        ))
        .map(option => (
          <button
            type="button"
            onClick={() => onChange({ value: option.value })}
            key={option.value.name}
          >
            {option.value.name}
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

export default Select;
