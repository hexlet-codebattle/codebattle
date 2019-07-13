import React, { PureComponent } from 'react';
import i18n from '../../i18n';

class ExecutionOutput extends PureComponent {
  renderStatusBadge = (status) => {
    const stautsColors = {
      error: 'danger',
      failure: 'warning',
      ok: 'success',
      nothing: 'info',
    };

    return <span className={`badge badge-${stautsColors[status]}`}>{status}</span>;
  };

  renderTestResults = (resultObj) => {
    switch (resultObj.status) {
      case '':
        return i18n.t('Run your code!');
      case 'error':
        return i18n.t('You have some syntax errors: %{errors}', { errors: resultObj.result, interpolation: { escapeValue: false } });
      case 'failure':
        if (Array.isArray(resultObj.result)) {
          return i18n.t('Test failed with arguments (%{arguments})%{percentMessage}', { arguments: resultObj.arguments.map(JSON.stringify).join(', '), percentMessage: this.getPercentOfSuccessTestsMesssage(resultObj.percent), interpolation: { escapeValue: false } });
        }
        return i18n.t('Test failed with arguments (%{arguments})%{percentMessage}', { arguments: JSON.stringify(resultObj.arguments), percentMessage: this.getPercentOfSuccessTestsMesssage(resultObj.percent), interpolation: { escapeValue: false } });
      case 'ok':
        return i18n.t('Yay! All tests passed!!111');
      default:
        return i18n.t('Oops');
    }
  };

  getPercentOfSuccessTestsMesssage = (percent) => {
    switch (percent) {
      case -1:
        return '';
      default:
        return i18n.t(', and you passed %{percent}% of asserts', { percent });
    }
  }

  parseOutput = (result) => {
    try {
      return JSON.parse(result || '{"result": "nothing", "status": "nothing"}');
    } catch (e) {
      return { result: 'something went wrong!', status: 'error' };
    }
  };

  isError = (result) => {
    if (result && result.status === 'error') {
      return true;
    }

    return false;
  }

  render() {
    const {
      output: {
        output, result, percent, asserts = [],
      } = {},
    } = this.props;
    const resultObj = this.parseOutput(result);

    return (
      <div className="card-body border-top">
        <div className="d-flex justify-content-between">
          <ul className="nav nav-tabs card-title">
            <li>
              <a
                className={`btn btn-sm rounded border btn-light ${this.isError(resultObj) ? '' : 'active'}`}
                data-toggle="tab"
                href="#asserts"
              >
                Asserts
              </a>
            </li>
            <li>
              <a
                className={`btn btn-sm rounded border btn-light ${this.isError(resultObj) ? 'active': ''}`}
                data-toggle="tab"
                href="#output"
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
          <code>{this.renderTestResults({ ...resultObj, percent })}</code>
        </p>
          <div className="tab-content">
            <div id="asserts" className={`tab-pane ${this.isError(resultObj) ? '' : 'active'}`}>
              <pre className="card-text d-none d-md-block mt-3">{asserts.join('\n')}</pre>
            </div>
            <div id="output" className={`tab-pane ${this.isError(resultObj) ? 'active' : ''}`}>
              <pre className="card-text d-none d-md-block mt-3">{output}</pre>
            </div>
          </div>
      </div>
    );
  }
}

export default ExecutionOutput;
