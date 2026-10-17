module.exports = {
  plugins: {
    'postcss-preset-mantine': {},
    'postcss-simple-vars': {
      variables: {
        'mantine-breakpoint-xs': '36em',
        'mantine-breakpoint-sm': '48em',
        'mantine-breakpoint-md': '62em',
        'mantine-breakpoint-lg': '75em',
        'mantine-breakpoint-xl': '88em',
      },
      // Vendor CSS may contain literal "$name" text (swagger-ui's `json-schema-2020-12-$vocabulary`
      // class names): leave it alone. Our own CSS still fails on an undefined variable.
      unknown(node, name) {
        if (node.source?.input.file?.includes('/node_modules/')) return;
        throw node.error(`Undefined variable $${name}`);
      },
    },
  },
};
