module.exports = {
  plugins: {
    // postcss-preset-mantine is needed when authoring Mantine-flavored CSS
    // modules (mixins, rem(), light-dark()). It's a no-op on plain CSS, so it's
    // safe to enable now ahead of the component migration.
    //
    // postcss-simple-vars was previously deferred because it threw on stray `$`
    // tokens in the compiled Bootstrap bundle. Bootstrap is gone (Phase 3), and
    // no remaining vendor output contains `$`, so it is safe to enable for
    // authoring `$mantine-breakpoint-*` media queries in Mantine CSS modules.
    'postcss-preset-mantine': {},
    'postcss-simple-vars': {},
  },
};
