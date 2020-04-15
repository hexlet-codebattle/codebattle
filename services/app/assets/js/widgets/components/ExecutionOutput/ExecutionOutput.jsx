import React, { useState } from 'react';
import _ from 'lodash';
import i18n from '../../../i18n';
import AccordeonBox from './AccordeonBox';


const getInfoAboutFailuresAsserts = (assertsCount, successCount) => {
  if (assertsCount === 0) {
    return '';
  }
  const percent = (100 * successCount) / assertsCount;
  return i18n.t(
    ', and you passed %{successCount} from %{assertsCount} asserts. (%{percent}%)',
    { percent, successCount, assertsCount },
  );
};

const parseOutput = result => {
  try {
    return JSON.parse(result || '{"result": "nothing", "status": "nothing"}');
  } catch (e) {
    return { result: 'something went wrong!', status: 'error' };
  }
};

const isError = resultData => {
  if (resultData && resultData.status === 'error') {
    return true;
  }

  return false;
};

const getTestResults = (resultData, assertsCount, successCount) => {
  switch (resultData.status) {
    case '':
      return i18n.t('Run your code!');
    case 'error':
      return i18n.t('You have some syntax errors: %{errors}', {
        errors: resultData.result,
        interpolation: { escapeValue: false },
      });
    case 'failure':
      if (Array.isArray(resultData.result)) {
        return i18n.t('Test failed with arguments (%{arguments})%{assertsInfo}', {
          arguments: resultData.arguments.map(JSON.stringify).join(', '),
          assertsInfo: getInfoAboutFailuresAsserts(assertsCount, successCount),
          interpolation: { escapeValue: false },
        });
      }
      return i18n.t('Test failed with arguments (%{arguments})%{assertsInfo}', {
        arguments: JSON.stringify(resultData.arguments),
        assertsInfo: getInfoAboutFailuresAsserts(assertsCount, successCount),
        interpolation: { escapeValue: false },
      });
    case 'ok':
      return i18n.t('Yay! All tests passed!!111');
    default:
      return i18n.t('Oops');
  }
};

const ExecutionOutput = ({
  output: {
    output, result, assertsCount, successCount,
  } = {}, id,
}) => {
  const renderStatusBadge = status => {
    const statusColors = {
      error: 'danger',
      failure: 'warning',
      ok: 'success',
      nothing: 'info',
    };

    return <span className={`badge badge-${statusColors[status]}`}>{status}</span>;
  };

  const resultData = parseOutput(result);
  const mockResultFail = {
    result: { status: 'failure' },
    asserts: [{
      status: 'failure', result: 0, output: '', expected: 2, arguments: [1, 1], execution_time: 0.000038945,
    },
    {
      status: 'success', result: 0, output: '', expected: 2, arguments: [1, 1], execution_time: 0.000038945,
    },
    {
      status: 'success', result: 0, output: '', expected: 2, arguments: [1, 1], execution_time: 0.000038945,
    }],
  };
  const mockResultOK = {
    result: { status: 'ok' },
    asserts: [{
      status: 'success', result: 0, output: '', expected: 2, arguments: [1, 1], execution_time: 0.000038945,
    },
    {
      status: 'success', result: 0, output: '', expected: 2, arguments: [1, 1], execution_time: 0.000038945,
    },
    {
      status: 'success', result: 0, output: '', expected: 2, arguments: [1, 1], execution_time: 0.000038945,
    }],
  };
  const mockResultError = {
    result: { status: 'error' },
    asserts: [{
      status: 'error', result: 0, output: '', expected: 2, arguments: [1, 1], execution_time: 0.000038945,
    }],
  };

  const handleCollapse = id => e => {

  };
  return (
    <>
      <div className="card-body border-top">
        <div className="d-flex justify-content-between">
          <ul className="nav nav-tabs card-title">
            <li>
              <a
                className={`btn btn-sm rounded border btn-light ${
                  isError(resultData) ? '' : 'active'
                }`}
                data-toggle="tab"
                href={`#asserts_${id}`}
              >
                Asserts
              </a>
            </li>
            <li>
              <a
                className={`btn btn-sm rounded border btn-light ${
                  isError(resultData) ? 'active' : ''
                }`}
                data-toggle="tab"
                href={`#output_${id}`}
              >
                Output
              </a>
            </li>
          </ul>
          <div className="card-subtitle mb-2 text-muted">
            Check status:
            {' '}
            {renderStatusBadge(resultData.status)}
          </div>
        </div>
        <p className="card-text mb-0">
          <code>{getTestResults(resultData, assertsCount, successCount)}</code>
        </p>
        <div className="tab-content">
          <div
            id={`asserts_${id}`}
            className={`tab-pane ${isError(resultData) ? '' : 'active'}`}
          >
            <pre className="card-text d-none d-md-block mt-3">{result}</pre>
          </div>
          <div
            id={`output_${id}`}
            className={`tab-pane ${isError(resultData) ? 'active' : ''}`}
          >
            <pre className="card-text d-none d-md-block mt-3">{output}</pre>
          </div>
        </div>
      </div>
      <AccordeonBox>
        <AccordeonBox.Menu count={mockResultFail.asserts.length} status={mockResultFail.result.status}>
          {mockResultFail.asserts.map((test, index) => (
            <AccordeonBox.Item key={_.uniqueId()} item={test} index={index} />
          ))}
        </AccordeonBox.Menu>
        <AccordeonBox.Menu count={mockResultOK.asserts.length} status={mockResultOK.result.status}>
          {mockResultOK.asserts.map((test, index) => (
            <AccordeonBox.Item key={_.uniqueId()} item={test} index={index} />
          ))}
        </AccordeonBox.Menu>
      </AccordeonBox>


    </>
  );
};

export default ExecutionOutput;
