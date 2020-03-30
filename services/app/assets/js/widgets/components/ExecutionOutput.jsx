import React from 'react';
import i18n from '../../i18n';

const ExecutionOutput = ({
  output: {
    output, result, assertsCount, successCount,
  } = {}, id,
}) => {

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

  const renderStatusBadge = status => {
    const stautsColors = {
      error: 'danger',
      failure: 'warning',
      ok: 'success',
      nothing: 'info',
    };

    return <span className={`badge badge-${stautsColors[status]}`}>{status}</span>;
  };

  const renderTestResults = (resultObj, assertsCount, successCount) => {
    switch (resultObj.status) {
      case '':
        return i18n.t('Run your code!');
      case 'error':
        return i18n.t('You have some syntax errors: %{errors}', {
          errors: resultObj.result,
          interpolation: { escapeValue: false },
        });
      case 'failure':
        if (Array.isArray(resultObj.result)) {
          return i18n.t('Test failed with arguments (%{arguments})%{assertsInfo}', {
            arguments: resultObj.arguments.map(JSON.stringify).join(', '),
            assertsInfo: getInfoAboutFailuresAsserts(assertsCount, successCount),
            interpolation: { escapeValue: false },
          });
        }
        return i18n.t('Test failed with arguments (%{arguments})%{assertsInfo}', {
          arguments: JSON.stringify(resultObj.arguments),
          assertsInfo: getInfoAboutFailuresAsserts(assertsCount, successCount),
          interpolation: { escapeValue: false },
        });
      case 'ok':
        return i18n.t('Yay! All tests passed!!111');
      default:
        return i18n.t('Oops');
    }
  };

  const parseOutput = result => {
    try {
      return JSON.parse(result || '{"result": "nothing", "status": "nothing"}');
    } catch (e) {
      return { result: 'something went wrong!', status: 'error' };
    }
  };

  const isError = result => {
    if (result && result.status === 'error') {
      return true;
    }

    return false;
  };

  const resultObj = parseOutput(result);

  return (
    <div className="card-body border-top">
      <div className="d-flex justify-content-between">
        <ul className="nav nav-tabs card-title">
          <li>
            <a
              className={`btn btn-sm rounded border btn-light ${
                isError(resultObj) ? '' : 'active'
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
                isError(resultObj) ? 'active' : ''
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
          {renderStatusBadge(resultObj.status)}
        </div>
      </div>
      <p className="card-text mb-0">
        <code>{renderTestResults(resultObj, assertsCount, successCount)}</code>
      </p>
      <div className="tab-content">
        <div
          id={`asserts_${id}`}
          className={`tab-pane ${isError(resultObj) ? '' : 'active'}`}
        >
          <pre className="card-text d-none d-md-block mt-3">{result}</pre>
        </div>
        <div
          id={`output_${id}`}
          className={`tab-pane ${isError(resultObj) ? 'active' : ''}`}
        >
          <pre className="card-text d-none d-md-block mt-3">{output}</pre>
        </div>
      </div>
    </div>
  );
};

export default ExecutionOutput;
