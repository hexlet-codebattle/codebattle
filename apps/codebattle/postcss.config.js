module.exports = {
  plugins: {
    // postcss-preset-mantine is needed when authoring Mantine-flavored CSS
    // modules (mixins, rem(), light-dark()). It's a no-op on plain CSS, so it's
    // safe to enable now ahead of the component migration.
    //
    // NOTE: postcss-simple-vars (Mantine's documented breakpoint-var companion)
    // is intentionally NOT enabled yet — it scans the whole compiled CSS bundle,
    // including Bootstrap/vendor output, and throws on stray `$` tokens. Add it
    // back in the component phase once we actually author `$mantine-breakpoint-*`
    // media queries, scoped so it doesn't process the legacy bundle.
    'postcss-preset-mantine': {},
  },
};
