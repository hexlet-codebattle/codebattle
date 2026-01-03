import React from 'react';

import { itemActionClassName, itemClassName } from '../../utils/builder';

const getText = (name, type) => (
  name ? `${name} (${type.name})` : `(${type.name})`
);

function SignaturePreview({
  argumentName,
  type,
}) {
  return (
    <div
      className={itemClassName}
    >
      <div
        title={getText(argumentName, type)}
        className={itemActionClassName}
      >
        {getText(argumentName, type)}
      </div>
    </div>
  );
}

export default SignaturePreview;
