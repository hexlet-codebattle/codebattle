export const taskStateCodes = {
  none: 'none',
  blank: 'blank',
  draft: 'draft',
  moderation: 'on_moderation',
  active: 'active',
  disabled: 'disabled',
};

export const taskVisibilityCodes = {
  public: 'public',
  hidden: 'hidden',
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
  visibility: taskVisibilityCodes.hidden,
};
