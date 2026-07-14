import React, { memo } from 'react';

import { camelizeKeys } from 'humps';
import uniqueId from 'lodash/uniqueId';

import i18next from '../../../i18n';
import AccordeonBox from '../../components/AccordeonBox';
import color from '../../config/statusColor';

export interface OutputAssert {
  id?: string | number;
  status: string;
  output?: string;
  executionTime?: number;
  // assert value/result/expected/arguments are arbitrary test-case data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface OutputData {
  status?: string;
  output?: string;
  outputError?: string;
  asserts?: OutputAssert[] | string[];
  successCount?: number;
  assertsCount?: number;
  version?: number;
}

interface EmptyOutputProps {
  statusColor?: string;
  executionTime?: number;
  assert?: OutputAssert;
  hasOutput?: boolean;
  uniqIndex?: string;
  fontSize?: number;
}

const EmptyOutput = memo(
  ({
    statusColor = 'info',
    executionTime = 0,
    assert = {} as OutputAssert,
    hasOutput = false,
    uniqIndex = uniqueId('heading'),
    fontSize,
  }: EmptyOutputProps) => (
    <>
      <AccordeonBox.SubMenu
        statusColor={statusColor}
        executionTime={executionTime}
        assert={assert}
        hasOutput={hasOutput}
        uniqIndex={uniqIndex}
        fontSize={fontSize}
      >
        <div className="alert text-white mb-0 pb-0">
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
        <div className="alert text-white mb-0 pb-0">
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
        <div className="alert text-white mb-0 pb-0">
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
        <div className="alert text-white mb-0 pb-0">
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
        <div className="alert text-white mb-0 pb-0">
          <pre>{assert.output}</pre>
        </div>
      </AccordeonBox.SubMenu>
    </>
  ),
);

interface OutputProps {
  fontSize?: number;
  sideOutput: OutputData;
  hideContent?: boolean;
}

function Output({ fontSize, sideOutput, hideContent }: OutputProps) {
  if (hideContent) {
    return <></>;
  }

  const { status, output, outputError, asserts, version = 0 } = sideOutput;

  const uniqIndex = uniqueId('heading');
  const normalizedAsserts: OutputAssert[] =
    version === 2
      ? (asserts as OutputAssert[]) || []
      : ((asserts as string[]) || []).map((elem) => camelizeKeys(JSON.parse(elem)) as OutputAssert);
  const normalizedOutput = version === 2 ? outputError : output;
  const isError = ['error', 'memory_leak', 'timeout', 'service_failure'].includes(status ?? '');

  if (['client_timeout', 'service_timeout'].includes(status ?? '')) {
    return (
      <div className="alert text-white pb-2">
        <pre>
          <span className="font-weight-bold d-block">Output:</span>
          <div>{i18next.t('We could not verify your solution')}</div>
          <div>{i18next.t('Please try to fix your code and submit it again')}</div>
          <div>
            {i18next.t('Note that your code may contain an infinite loop or complex calculations')}
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
        normalizedAsserts &&
        normalizedAsserts.map((assert, index) => (
          <AccordeonBox.SubMenu
            key={assert.id || `assert-${index}`}
            fontSize={fontSize}
            statusColor={color[assert.status as keyof typeof color]}
            executionTime={assert.executionTime}
            assert={assert}
            hasOutput={assert.output}
            uniqIndex={uniqIndex}
          >
            <div className="alert text-white mb-0 pb-0">
              <pre>{assert.output}</pre>
            </div>
          </AccordeonBox.SubMenu>
        ))
      )}
    </>
  );
}

export default Output;
