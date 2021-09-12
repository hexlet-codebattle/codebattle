import React from 'react';
import _ from 'lodash';
import { camelizeKeys } from 'humps';
import AccordeonBox from './AccordeonBox';
import color from '../../config/statusColor';

const Output = ({ sideOutput }) => {
  const {
 status, output, result, asserts, version = 0,
} = sideOutput;
  const uniqIndex = _.uniqueId('heading');
  const normalizedAsserts = version === 2 ? asserts : asserts.map(elem => camelizeKeys(JSON.parse(elem)));
  return (
    <>
      {status === 'error' || status === 'memory_leak' ? (
        <AccordeonBox.Item output={output} result={result} />
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
