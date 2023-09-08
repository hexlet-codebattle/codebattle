import React from 'react';

import { itemActionClassName, itemClassName } from '../../utils/builder';

const getText = (name, type) => (name ? `${name} (${type.name})` : `(${type.name})`);

function SignaturePreview({ argumentName, type }) {
  return (
    <div className={itemClassName}>
      <div className={itemActionClassName} title={getText(argumentName, type)}>
        {getText(argumentName, type)}
      </div>
    </div>
  );
}

export default SignaturePreview;
