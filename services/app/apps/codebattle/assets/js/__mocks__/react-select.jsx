import React, { useState } from 'react';

function Select({ filterOption, onChange, options }) {
  const [selectInput, setSelectInput] = useState('task');

  return (
    <div>
      {options
        .filter((option) => filterOption({ value: { name: option.value.name } }, selectInput))
        .map((option) => (
          <button
            key={option.value.name}
            type="button"
            onClick={() => onChange({ value: option.value })}
          >
            {option.value.name}
          </button>
        ))}
      <button key="filterOption" type="button" onClick={() => setSelectInput('nAme')}>
        filter tasks by name
      </button>
    </div>
  );
}

export default Select;
