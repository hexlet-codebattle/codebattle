import * as Yup from 'yup';

const braillePatternBlank = '\u2800';
const space = ' ';
const invalidSymbols = [braillePatternBlank, space];

const emailSchema = Yup.string()
  .email('Invalid email')
  .test(
    'exclude-braille-pattern-blank',
    'Invalid email',
    value => (
      value
        ? !value.includes(braillePatternBlank)
        : true
    ),
  )
  .matches(/^[a-zA-Z0-9]{1}[^;]*@[^;]*$/i, 'Should begin and end with a Latin letter or number')
  .matches(/^[_a-zA-Z0-9-]+(\.[_a-zA-Z0-9-]+)*@[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*(\.[a-zA-Z]{2,})$/i, 'Can\'t contain special symbols')
  .required('Email required');

const nameSchema = settings => Yup.string()
  .strict()
  .min(3, 'Should be at least 3 characters')
  .max(16, 'Should be 16 characters or less')
  .test(
    'start-or-end-with-empty-symbols',
    'Can\'t start or end with empty symbols',
    value => {
      if (!value) {
        return true;
      }
      const invalidSymbolIndex = invalidSymbols.findIndex(invalidSymbol => (
        value.startsWith(invalidSymbol) || value.endsWith(invalidSymbol)
      ));
      return invalidSymbolIndex === -1;
    },
  )
  .test(
    'max',
    'Should be 16 characters or less',
    (name = '') => (
      settings.name === name || name.length <= 16
    ),
  )
  .matches(
    /^[a-zA-Z][a-zA-Z0-9_-]*[a-zA-Z0-9_]$/,
    'Should contain Latin letters, numbers and underscores. Only begin with latin letter',
  )
  .trim();

const schemas = {
  userSettings: settings => ({
    name: nameSchema(settings)
      .required("Field can't be empty"),
    clan: Yup.string().strict(),
  }),
  resetPassword: {
    email: emailSchema,
  },
  signIn: {
    email: emailSchema,
    password: Yup.string().required('Password required'),
  },
  signUp: {
    name: nameSchema()
      .required('Nickname required'),
    email: emailSchema,
    password: Yup
      .string()
      .matches(/^\S*$/, 'Can\'t contain empty symbols')
      .min(6, 'Password should be from 6 to 16 characters')
      .max(16, 'Password should be from 6 to 16 characters')
      .required('Password required'),
    passwordConfirmation: Yup
      .string()
      .required('Confirmation required')
      .oneOf([Yup.ref('password')], 'Passwords must match'),
  },
};

export default schemas;
