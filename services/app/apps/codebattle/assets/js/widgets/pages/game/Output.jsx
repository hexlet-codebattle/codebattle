import React, { memo } from 'react';

import { camelizeKeys } from 'humps';
import i18next from 'i18next';
import uniqueId from 'lodash/uniqueId';

import AccordeonBox from '../../components/AccordeonBox';
import color from '../../config/statusColor';

const EmptyOutput = memo(
  ({
    statusColor = 'info',
    executionTime = 0,
    assert = {},
    hasOutput = false,
    uniqIndex = uniqueId('heading'),
    fontSize,
  }) => (
    <>
      <AccordeonBox.SubMenu
        statusColor={statusColor}
        executionTime={executionTime}
        assert={assert}
        hasOutput={hasOutput}
        uniqIndex={uniqIndex}
        fontSize={fontSize}
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
        fontSize={fontSize}
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
        fontSize={fontSize}
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
        fontSize={fontSize}
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
        fontSize={fontSize}
      >
        <div className="alert alert-secondary mb-0 pb-0">
          <pre>{assert.output}</pre>
        </div>
      </AccordeonBox.SubMenu>
    </>
  ),
);

const Output = ({ fontSize, sideOutput, hideContent }) => {
  if (hideContent) {
    return <></>;
  }

  const {
 status, output, outputError, asserts, version = 0,
} = sideOutput;

  const uniqIndex = uniqueId('heading');
  const normalizedAsserts = version === 2
      ? asserts || []
      : (asserts || []).map(elem => camelizeKeys(JSON.parse(elem)));
  const normalizedOutput = version === 2 ? outputError : output;
  const isError = [
    'error',
    'memory_leak',
    'timeout',
    'service_failure',
  ].includes(status);

  if (['client_timeout', 'service_timeout'].includes(status)) {
    return (
      <div className="alert alert-secondary pb-2">
        <pre>
          <span className="font-weight-bold d-block">Output:</span>
          <div>{i18next.t('We could not verify your solution')}</div>
          <div>
            {i18next.t('Please try to fix your code and submit it again')}
          </div>
          <div>
            {i18next.t(
              'Note that your code may contain an infinite loop or complex calculations',
            )}
          </div>
        </pre>
      </div>
    );
  }

  if ((!normalizedAsserts || normalizedAsserts.length === 0) && !isError) {
    return <EmptyOutput fontSize={fontSize} />;
  }

  return (
    <>
      {isError ? (
        <AccordeonBox.Item fontSize={fontSize} output={normalizedOutput} />
      ) : (
        normalizedAsserts
        && normalizedAsserts.map((assert, index) => (
          <AccordeonBox.SubMenu
            key={index.toString()}
            fontSize={fontSize}
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
