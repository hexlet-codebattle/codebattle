export const argumentTypes = {
  integer: 'integer',
  string: 'string',
  float: 'float',
  boolean: 'boolean',
  hash: 'hash',
  array: 'array',
};

export const taskTemplatesStates = {
  init: 'init',
  loading: 'loading',
  none: 'none',
};

export const MAX_INPUT_ARGUMENTS_COUNT = 3;
export const MIN_EXAMPLES_COUNT = 3;
export const MAX_NESTED_TYPE_LEVEL = 3;
export const MIN_NAME_LENGTH = 4;
export const MAX_NAME_LENGTH = 1024;
export const MIN_DESCRIPTION_LENGTH = 4;
export const MAX_DESCRIPTION_LENGTH = 1024;

export const itemClassName = 'btn-group border-gray rounded-lg m-1 mr-2';
export const itemActionClassName = 'btn-sm text-nowrap border-0';
export const itemAddClassName =
  'btn btn-sm btn-outline-secondary border-0 text-nowrap rounded-lg my-1 py-2';

export const argumentTypeNames = [
  argumentTypes.integer,
  argumentTypes.string,
  argumentTypes.float,
  argumentTypes.boolean,
  argumentTypes.array,
  argumentTypes.hash,
];

export const defaultSignatureByType = {
  [argumentTypes.integer]: { type: { name: argumentTypes.integer } },
  [argumentTypes.string]: { type: { name: argumentTypes.string } },
  [argumentTypes.float]: { type: { name: argumentTypes.float } },
  [argumentTypes.boolean]: { type: { name: argumentTypes.boolean } },
  [argumentTypes.hash]: {
    type: { name: argumentTypes.hash, nested: { name: argumentTypes.integer } },
  },
  [argumentTypes.array]: {
    type: { name: argumentTypes.array, nested: { name: argumentTypes.integer } },
  },
};

export const getDefaultInputSignatureByType = (type) => ({
  argumentName: '',
  ...defaultSignatureByType[type],
});

export const getExamplesFromAsserts = (asserts) =>
  `\`\`\`\n${asserts
    .map(({ arguments: args, expected }) => {
      const argsStr = JSON.stringify(JSON.parse(args));
      return `${expected} == solution(${argsStr.slice(1, argsStr.length - 1)})`;
    })
    .join('\n')}`;

export const labelTaskParamsWithIds = (task) => ({
  ...task,
  assertsExamples: task.assertsExamples.map((item, index) => ({ ...item, id: index })),
  inputSignature: task.inputSignature.map((item, index) => ({ ...item, id: index })),
  outputSignature: { ...task.outputSignature, id: Date.now() },
});

export const getTaskTemplates = (task) => ({
  state:
    !task.solution && !task.argumentsGenerator
      ? taskTemplatesStates.none
      : taskTemplatesStates.init,
  solution: task.solution ? { [task.generatorLang]: task.solution } : {},
  argumentsGenerator: task.argumentsGenerator
    ? { [task.generatorLang]: task.argumentsGenerator }
    : {},
});

export const haveNestedType = (type) => !!defaultSignatureByType[type].type.nested;

export const validateTaskName = (name) => {
  if (!name || name.length === 0) {
    return [false, 'Name is required'];
  }

  if (name.length < MIN_NAME_LENGTH) {
    return [false, `Name length must be greater than ${MIN_NAME_LENGTH - 1}`];
  }

  if (name.length > MAX_NAME_LENGTH) {
    return [false, `Name length must be less than ${MAX_NAME_LENGTH}`];
  }

  return [true];
};

export const validateDescription = (description) => {
  if (!description || description.length === 0) {
    return [false, 'Description is required'];
  }

  if (description.length < MIN_DESCRIPTION_LENGTH) {
    return [false, `Description length must be greater than ${MIN_DESCRIPTION_LENGTH - 1}`];
  }

  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return [false, `Description length must be less than ${MAX_DESCRIPTION_LENGTH}`];
  }

  return [true];
};

export const validateInputSignatures = (inputSignature) => {
  if (inputSignature.length === 0) {
    return [false, 'At least 1 argument must be described'];
  }

  return [true];
};

export const validateExamples = (examples) => {
  if (examples.length < MIN_EXAMPLES_COUNT) {
    return [false, `Must be at least ${MIN_EXAMPLES_COUNT} examples`];
  }

  return [true];
};
