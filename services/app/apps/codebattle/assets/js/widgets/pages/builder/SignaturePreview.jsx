import React from 'react';
import { itemActionClassName, itemClassName } from '../../utils/builder';

const getText = (name, type) => (
  name ? `${name} (${type.name})` : `(${type.name})`
);

const SignaturePreview = ({
  argumentName,
  type,
}) => (
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

export default SignaturePreview;
