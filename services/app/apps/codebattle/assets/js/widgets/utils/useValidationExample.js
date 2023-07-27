import { useMemo } from 'react';
import _ from 'lodash';
import { argumentTypes } from './builder';

const isValidValueToSignature = (value, signature) => {
  if (!signature) {
    return false;
  }

  switch (signature.name) {
    case argumentTypes.float: {
      return _.isNumber(value);
    }
    case argumentTypes.integer: {
      return _.isNumber(value) && Math.floor(value) === value;
    }
    case argumentTypes.boolean: {
      return _.isBoolean(value);
    }
    case argumentTypes.array: {
      return _.isArray(value) && !value.some(item => !isValidValueToSignature(item, signature.nested));
    }
    case argumentTypes.hash: {
      return !_.isArray(value)
        && _.isObject(value)
        && !Object.keys(value).some(item => item.length === 0)
        && !Object.values(value).some(item => !isValidValueToSignature(item, signature.nested));
    }
    default: {
      return false;
    }
  }
};

const useValidationExample = ({
  suggest,
  inputSignature,
  outputSignature,
}) => {
  const [validArguments, reasonInvalidArguments] = useMemo(() => {
    try {
      if (!suggest) {
        return [false, ''];
      }

      if (_.isEmpty(suggest.arguments)) {
        return [false, ''];
      }

      const data = JSON.parse(suggest.arguments);

      if (!_.isArray(data)) {
        return [false, 'Must be array'];
      }

      if (inputSignature.length !== data.length) {
        return [false, `Must be ${inputSignature.length} args [Now ${data.length}]`];
      }

      if (
        data.some((arg, index) => !isValidValueToSignature(arg, inputSignature[index].type))
      ) {
        return [false, 'Doesn\'t match with signature'];
      }

      return [true];
    } catch (_error) {
      return [false, 'Not valid arguments'];
    }
  }, [suggest, inputSignature]);
  const [validExpected, reasonInvalidExpected] = useMemo(() => {
    try {
      if (!suggest) {
        return [false, ''];
      }

      if (_.isEmpty(suggest.expected)) {
        return [false, ''];
      }

      const data = JSON.parse(suggest.expected);

      if (!isValidValueToSignature(data, outputSignature.type)) {
        return [false, 'Doesn\'t match with signature'];
      }

      return [true];
    } catch (_error) {
      return [false, 'Not valid expected'];
    }
  }, [suggest, outputSignature]);

  const validationStatus = useMemo(() => ({
    arguments: { valid: validArguments, reason: reasonInvalidArguments },
    expected: { valid: validExpected, reason: reasonInvalidExpected },
  }), [validArguments, validExpected, reasonInvalidArguments, reasonInvalidExpected]);

  return validationStatus;
};

export default useValidationExample;
