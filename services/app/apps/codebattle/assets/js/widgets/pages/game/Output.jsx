import React, { memo } from 'react';

import { camelizeKeys } from 'humps';
import uniqueId from 'lodash/uniqueId';

import AccordeonBox from '../../components/AccordeonBox';
import color from '../../config/statusColor';

const EmptyOutput = memo(({
  statusColor = 'info',
  executionTime = 0,
  assert = {},
  hasOutput = false,
  uniqIndex = uniqueId('heading'),
}) => (
  <>
    <AccordeonBox.SubMenu
      statusColor={statusColor}
      executionTime={executionTime}
      assert={assert}
      hasOutput={hasOutput}
      uniqIndex={uniqIndex}
    >
      <div className="alert alert-secondary mb-0 pb-0">
        <pre>{assert.output}</pre>
      </div>
    </AccordeonBox.SubMenu>
    <AccordeonBox.SubMenu
      statusColor={statusColor}
      executionTime={executionTime}
      assert={assert}
      hasOutput={hasOutput}
      uniqIndex={uniqIndex}
    >
      <div className="alert alert-secondary mb-0 pb-0">
        <pre>{assert.output}</pre>
      </div>
    </AccordeonBox.SubMenu>
    <AccordeonBox.SubMenu
      statusColor={statusColor}
      executionTime={executionTime}
      assert={assert}
      hasOutput={hasOutput}
      uniqIndex={uniqIndex}
    >
      <div className="alert alert-secondary mb-0 pb-0">
        <pre>{assert.output}</pre>
      </div>
    </AccordeonBox.SubMenu>
    <AccordeonBox.SubMenu
      statusColor={statusColor}
      executionTime={executionTime}
      assert={assert}
      hasOutput={hasOutput}
      uniqIndex={uniqIndex}
    >
      <div className="alert alert-secondary mb-0 pb-0">
        <pre>{assert.output}</pre>
      </div>
    </AccordeonBox.SubMenu>
    <AccordeonBox.SubMenu
      statusColor={statusColor}
      executionTime={executionTime}
      assert={assert}
      hasOutput={hasOutput}
      uniqIndex={uniqIndex}
    >
      <div className="alert alert-secondary mb-0 pb-0">
        <pre>{assert.output}</pre>
      </div>
    </AccordeonBox.SubMenu>
  </>
));

const Output = ({ sideOutput }) => {
  const {
 status, output, outputError, asserts, version = 0,
} = sideOutput;

  const uniqIndex = uniqueId('heading');
  const normalizedAsserts = version === 2
      ? asserts
      : asserts.map(elem => camelizeKeys(JSON.parse(elem)));
  const normalizedOutput = version === 2 ? outputError : output;
  const isError = ['error', 'memory_leak', 'timeout'].includes(status);

  if ((!normalizedAsserts || normalizedAsserts.length === 0) && !isError) {
    return <EmptyOutput />;
  }

  return (
    <>
      {isError ? (
        <AccordeonBox.Item output={normalizedOutput} />
      ) : (
        normalizedAsserts
        && normalizedAsserts.map((assert, index) => (
          <AccordeonBox.SubMenu
            key={index.toString()}
            statusColor={color[assert.status]}
            executionTime={assert.executionTime}
            assert={assert}
            hasOutput={assert.output}
            uniqIndex={uniqIndex}
          >
            <div className="alert alert-secondary mb-0 pb-0">
              <pre>{assert.output}</pre>
            </div>
          </AccordeonBox.SubMenu>
        ))
      )}
    </>
  );
};

export default Output;
