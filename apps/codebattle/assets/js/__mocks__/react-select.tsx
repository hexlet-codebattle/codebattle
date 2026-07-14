import React, { useState } from 'react';
import { vi } from 'vitest';

const { createFilter } = await vi.importActual<typeof import('react-select')>('react-select');

interface SelectOption {
  name: string;
}

interface SelectProps {
  options: SelectOption[];
  onChange: (option: SelectOption) => void;
  filterOption: (option: { data: SelectOption }, input: string) => boolean;
}

function Select({ options, onChange, filterOption }: SelectProps) {
  const [selectInput, setSelectInput] = useState('task');

  return (
    <div>
      {options
        .filter(({ name }) => filterOption({ data: { name } }, selectInput))
        .map((option) => (
          <button type="button" onClick={() => onChange(option)} key={option.name}>
            {option.name}
          </button>
        ))}
      <button type="button" onClick={() => setSelectInput('nAme')} key="filterOption">
        filter tasks by name
      </button>
    </div>
  );
}

export { createFilter };
export default Select;
