import React from 'react';
import i18n from '../../../i18n';
import AccordeonBox from './AccordeonBox';
import statusColor from '../../config/statusColor';

const getMessage = status => {
  switch (status) {
    case 'memory_leak':
      return i18n.t('Your solution ran out of memory');
    case 'error':
      return i18n.t('You have some syntax errors');
    case 'failure':
      return i18n.t('Test failed');
    case 'ok':
      return i18n.t('Yay! All tests passed!!111');
    default:
      return i18n.t('Press Check solution or press Give up');
  }
};

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
  const percent = (100 * successCount) / assertsCount;
  return (
    <AccordeonBox>
      <AccordeonBox.Menu
        count={i18n.t(
          'You passed %{successCount} from %{assertsCount} asserts. (%{percent}%)',
          { successCount, assertsCount, percent },
        )}
        statusColor={statusColor[resultData.status]}
        message={getMessage(resultData.status)}
        firstAssert={firstAssert}
      >
        {resultData.status === 'error' || resultData.status === 'memory_leak' ? (
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
