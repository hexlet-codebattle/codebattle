import React from 'react';

import { itemActionClassName, itemClassName } from '../../utils/builder';

const getText = (args, expected) => `${JSON.stringify(args)} -> ${JSON.stringify(expected)}`;

function ExamplePreview({ arguments: args, expected }) {
  return (
    <div className={itemClassName}>
      <div className={itemActionClassName} title={getText(args, expected)}>
        {getText(args, expected)}
      </div>
    </div>
  );
}

export default ExamplePreview;
