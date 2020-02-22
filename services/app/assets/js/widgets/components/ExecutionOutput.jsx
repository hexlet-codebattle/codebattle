import React, { PureComponent } from 'react';
import i18n from '../../i18n';

class ExecutionOutput extends PureComponent {
  renderStatusBadge = status => {
    const stautsColors = {
      error: 'danger',
      failure: 'warning',
      ok: 'success',
      nothing: 'info',
    };

    return <span className={`badge badge-${stautsColors[status]}`}>{status}</span>;
  };

  renderTestResults = (resultObj, assertsCount, successCount) => {
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
            assertsInfo: this.getInfoAboutFailuresAsserts(assertsCount, successCount),
            interpolation: { escapeValue: false },
          });
        }
        return i18n.t('Test failed with arguments (%{arguments})%{assertsInfo}', {
          arguments: JSON.stringify(resultObj.arguments),
          assertsInfo: this.getInfoAboutFailuresAsserts(assertsCount, successCount),
          interpolation: { escapeValue: false },
        });
      case 'ok':
        return i18n.t('Yay! All tests passed!!111');
      default:
        return i18n.t('Oops');
    }
  };

  getInfoAboutFailuresAsserts = (assertsCount, successCount) => {
    switch (assertsCount) {
      case 0:
        return '';
      default: {
        const percent = (100 * successCount) / assertsCount;
        return i18n.t(
          ', and you passed %{successCount} from %{assertsCount} asserts. (%{percent}%)',
          { percent, successCount, assertsCount },
        );
      }
    }
  };

  parseOutput = result => {
    try {
      return JSON.parse(result || '{"result": "nothing", "status": "nothing"}');
    } catch (e) {
      return { result: 'something went wrong!', status: 'error' };
    }
  };

  isError = result => {
    if (result && result.status === 'error') {
      return true;
    }

    return false;
  };

  render() {
    const {
      output: {
        output, result, assertsCount, successCount,
      } = {}, id,
    } = this.props;
    const resultObj = this.parseOutput(result);

    return (
      <div className="card-body border-top">
        <div className="d-flex justify-content-between">
          <ul className="nav nav-tabs card-title">
            <li>
              <a
                className={`btn btn-sm rounded border btn-light ${
                  this.isError(resultObj) ? '' : 'active'
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
                  this.isError(resultObj) ? 'active' : ''
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
            {this.renderStatusBadge(resultObj.status)}
          </div>
        </div>
        <p className="card-text mb-0">
          <code>{this.renderTestResults(resultObj, assertsCount, successCount)}</code>
        </p>
        <div className="tab-content">
          <div
            id={`asserts_${id}`}
            className={`tab-pane ${this.isError(resultObj) ? '' : 'active'}`}
          >
            <pre className="card-text d-none d-md-block mt-3">{result}</pre>
          </div>
          <div
            id={`output_${id}`}
            className={`tab-pane ${this.isError(resultObj) ? 'active' : ''}`}
          >
            <pre className="card-text d-none d-md-block mt-3">{output}</pre>
          </div>
        </div>
      </div>
    );
  }
}

export default ExecutionOutput;
