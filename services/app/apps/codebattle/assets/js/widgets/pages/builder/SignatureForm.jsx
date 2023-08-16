import React, {
  useMemo,
  useCallback,
} from 'react';
import _ from 'lodash';
import {
  haveNestedType,
  argumentTypes,
  argumentTypeNames,
  MAX_NESTED_TYPE_LEVEL,
} from '../../utils/builder';

const resolveSignatureToTypes = signature => {
  if (!signature) {
    return [];
  }

  let rawType = signature.type;
  const types = [];

  while (rawType) {
    types.push(rawType.name);
    rawType = rawType.nested;
  }

  return types;
};

function SignatureForm({ signature, handleEdit }) {
  const types = useMemo(() => resolveSignatureToTypes(signature), [signature]);

  const handleSelect = useCallback((newType, nestedIndex) => {
    const newTypes = types.map((type, index) => (index === nestedIndex ? newType : type));
    const newSuggestType = _.reverse(newTypes).reduce((acc, type) => {
      if (haveNestedType(type)) {
        const nested = _.isEmpty(acc) ? { name: argumentTypes.integer } : acc;
        return { name: type, nested };
      }

      return { name: type };
    }, {});
    handleEdit({ argumentName: signature.argumentName, id: signature.id, type: newSuggestType });
  }, [handleEdit, types, signature]);

  if (_.isEmpty(signature)) {
    return null;
  }

  return types.map((typeName, index) => (
    <select
      // eslint-disable-next-line react/no-array-index-key
      key={`${typeName}-${index}`}
      className="form-control custom-select rounded-lg m-1 cb-builder-type-selector"
      value={typeName}
      onChange={e => { handleSelect(e.target.value, index); }}
      size={1}
    >
      {argumentTypeNames.map(t => (
        <option
          key={t}
          value={t}
          disabled={haveNestedType(t) && index + 1 > MAX_NESTED_TYPE_LEVEL}
        >
          {t}
        </option>
      ))}
    </select>
  ));
}

export default SignatureForm;
