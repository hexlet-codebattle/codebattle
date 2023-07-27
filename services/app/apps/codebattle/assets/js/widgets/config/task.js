export const taskStateCodes = {
  none: 'none',
  blank: 'blank',
  draft: 'draft',
};

export default {
  name: '',
  level: 'elementary',
  state: taskStateCodes.none,
  descriptionEn: '',
  descriptionRu: '',
  inputSignature: [],
  outputSignature: { type: { name: 'integer' } },
  assertsExamples: [],
  asserts: [],
  examples: '',
  solution: '',
  argumentsGenerator: '',
};
