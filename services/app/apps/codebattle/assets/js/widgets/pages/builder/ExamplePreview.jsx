import React from 'react';
import { itemActionClassName, itemClassName } from '../../utils/builder';

const getText = (args, expected) => (
  `${JSON.stringify(args)} -> ${JSON.stringify(expected)}`
);

const ExamplePreview = ({
  arguments: args,
  expected,
}) => (
  <div
    className={itemClassName}
  >
    <div
      title={getText(args, expected)}
      className={itemActionClassName}
    >
      {getText(args, expected)}
    </div>
  </div>
);

export default ExamplePreview;
