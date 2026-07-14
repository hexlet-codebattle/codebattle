import React, { useEffect, useState } from 'react';

interface Entity {
  name: string;
}

interface AsyncOption {
  value: Entity;
}

interface AsyncSelectProps {
  loadOptions: (input: string, callback: (options: AsyncOption[]) => void) => void;
  onChange: (option: AsyncOption) => void;
}

function AsyncSelect({ loadOptions, onChange }: AsyncSelectProps) {
  const [entities, setEntities] = useState<Entity[]>([]);

  useEffect(() => {
    const callback = (options: AsyncOption[]) => {
      setEntities(options.map((option) => option.value));
    };

    loadOptions('test', callback);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      {entities.map((entity) => (
        <button type="button" onClick={() => onChange({ value: entity })} key={entity.name}>
          {entity.name}
        </button>
      ))}
    </div>
  );
}

export default AsyncSelect;
