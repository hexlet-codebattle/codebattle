import React, { useState, useEffect } from 'react';

const AsyncSelect = ({ loadOptions, onChange }) => {
  const [entities, setEntities] = useState([]);

  useEffect(() => {
    const callback = options => {
      setEntities(options.map(option => option.value));
    };

    loadOptions('test', callback);
  }, []);

  return (
    <div>
      {entities.map(entity => (
        <button
          type="button"
          onClick={() => onChange({ value: entity })}
          key={entity.name}
        >
          {entity.name}
        </button>
      ))}
    </div>
  );
};

export default AsyncSelect;
