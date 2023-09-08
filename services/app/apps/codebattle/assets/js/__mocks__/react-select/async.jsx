import React, { useState, useEffect } from 'react';

function AsyncSelect({ loadOptions, onChange }) {
  const [entities, setEntities] = useState([]);

  useEffect(() => {
    const callback = (options) => {
      setEntities(options.map((option) => option.value));
    };

    loadOptions('test', callback);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      {entities.map((entity) => (
        <button key={entity.name} type="button" onClick={() => onChange({ value: entity })}>
          {entity.name}
        </button>
      ))}
    </div>
  );
}

export default AsyncSelect;
