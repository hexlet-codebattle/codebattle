import React from 'react';
import AccordeonBox from './AccordeonBox';
import statusColor from '../../config/statusColor';

const parseResult = result => {
  if (result) return JSON.parse(result);
  return { status: 'info' };
};

const ExecutionOutput = ({
  output: {
    output, result, asserts = [], assertsCount, successCount,
  } = {},
}) => {
  const resultData = parseResult(result);
  const allAsserts = asserts.map(JSON.parse);
  const [firstAssert, ...restAsserts] = allAsserts;
  return (
    <AccordeonBox>
      <AccordeonBox.Menu
        assertsCount={assertsCount}
        successCount={successCount}
        firstAssert={firstAssert}
        resultData={resultData}
      >
        {resultData.status === 'error' ? (
          <AccordeonBox.Item
            output={output}
            result={resultData.result}
          />
        ) : (
          restAsserts && restAsserts.map((assert, index) => (
            <AccordeonBox.SubMenu
              key={index.toString()}
              statusColor={statusColor[assert.status]}
              assert={assert}
              hasOutput={assert.output}
            >
              <AccordeonBox.Item
                output={assert.output}
              />
            </AccordeonBox.SubMenu>
          ))
        )}
      </AccordeonBox.Menu>
    </AccordeonBox>
  );
};

export default ExecutionOutput;
