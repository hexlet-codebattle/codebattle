import React from 'react';

import { camelizeKeys } from 'humps';
import uniqueId from 'lodash/uniqueId';

import AccordeonBox from '../../components/AccordeonBox';
import color from '../../config/statusColor';

function Output({ sideOutput }) {
  const { asserts, output, outputError, status, version = 0 } = sideOutput;

  const uniqIndex = uniqueId('heading');
  const normalizedAsserts =
    version === 2 ? asserts : asserts.map((elem) => camelizeKeys(JSON.parse(elem)));
  const normalizedOutput = version === 2 ? outputError : output;

  return ['error', 'memory_leak', 'timeout'].includes(status) ? (
    <AccordeonBox.Item output={normalizedOutput} />
  ) : (
    normalizedAsserts &&
      normalizedAsserts.map((assert) => (
        <AccordeonBox.SubMenu
          assert={assert}
          executionTime={assert.executionTime}
          hasOutput={assert.output}
          statusColor={color[assert.status]}
          uniqIndex={uniqIndex}
        >
          <div className="alert alert-secondary mb-0 pb-0">
            <pre>{assert.output}</pre>
          </div>
        </AccordeonBox.SubMenu>
      ))
  );
}

export default Output;
