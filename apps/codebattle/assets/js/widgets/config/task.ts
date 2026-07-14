/**
 * Task states for builder.
 * @readonly
 * @enum {string}
 */
export const taskStateCodes = {
  none: 'none',
  blank: 'blank',
  draft: 'draft',
  moderation: 'on_moderation',
  active: 'active',
  disabled: 'disabled',
};

/**
 * Task visibility states for builder.
 * @readonly
 * @enum {string}
 */
export const taskVisibilityCodes = {
  public: 'public',
  hidden: 'hidden',
};
