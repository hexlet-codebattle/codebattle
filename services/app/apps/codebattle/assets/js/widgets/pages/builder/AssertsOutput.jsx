import React, { memo } from 'react';

import uniqueId from 'lodash/uniqueId';

import AccordeonBox from '../../components/AccordeonBox';
import assertsStatuses from '../../config/executionStatuses';
import color from '../../config/statusColor';

const AssertsOutput = memo(({ asserts, output, status }) => {
  const uniqIndex = uniqueId('assertsOutput');

  return (
    <div className="overflow-auto" style={{ maxHeight: '412px' }}>
      {(status === assertsStatuses.error && asserts.length === 0) ||
      [assertsStatuses.memoryLeak, assertsStatuses.timeout].includes(status) ? (
        <AccordeonBox.Item output={output} />
      ) : (
        asserts &&
        asserts.map((assert, index) => (
          <AccordeonBox.SubMenu
            executionTime={assert.executionTime || 0}
            hasOutput={assert.output || assert.message}
            statusColor={color[assert.status]}
            uniqIndex={uniqIndex}
            assert={{
              ...assert,
              id: assert.id || index,
              value: assert.actual || assert.expected,
            }}
          >
            <div className="alert alert-secondary mb-0 pb-0">
              <pre>{assert.output}</pre>
            </div>
          </AccordeonBox.SubMenu>
        ))
      )}
    </div>
  );
});

export default AssertsOutput;
