import React from 'react';
import _ from 'lodash';
import i18n from '../../../i18n';
import AccordeonBox from './AccordeonBox';

const statusColor = {
  '': 'info',
  error: 'danger',
  failure: 'warning',
  ok: 'success',
  success: 'success',
};
const getMessage = status => {
  switch (status) {
    case 'error':
      return i18n.t('You have some syntax errors');
    case 'failure':
      return i18n.t('Test failed ');
    case 'ok':
      return i18n.t('Yay! All tests passed!!111');
    default:
      return i18n.t('Oops');
  }
};

const ExecutionOutput = ({
  output: {
    output, result = {}, asserts = [], assertsCount, successCount,
  } = {},
}) => {
  if (_.isEmpty(output)) {
    return null;
  }
  const resultData = JSON.parse(result);
  const assertsData = asserts.map(JSON.parse);
  const countFailAsserts = assertsCount - successCount;

  return (
    <>
      <AccordeonBox>
        <AccordeonBox.Menu
          count={`${countFailAsserts} of ${assertsData.length}`}
          statusColor={statusColor[resultData.status]}
          message={getMessage(resultData.status)}
        >
          {}
          {resultData.status === 'error'
            ? (
              <AccordeonBox.Item
                statusColor={statusColor[resultData.status]}
                output={output}
                result={resultData.result}
              />
            )
            : assertsData.map((assert, index) => (
              <AccordeonBox.SubMenu
                key={index.toString()}
                statusColor={statusColor[assert.status]}
                assert={assert}
              >
                <AccordeonBox.Item
                  statusColor={statusColor[assert.status]}
                  output={assert.output}
                />
              </AccordeonBox.SubMenu>
            ))}
        </AccordeonBox.Menu>
      </AccordeonBox>


    </>
  );
};

export default ExecutionOutput;
