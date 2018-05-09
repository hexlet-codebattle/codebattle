import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

class ExecutionOutput extends PureComponent {
  static propTypes = {
    output: PropTypes.string.isRequired,
  };

  renderStatusBadge = (status) => {
    const stautsColors = {
      error: 'danger',
      failure: 'warning',
      success: 'success',
      nothing: 'info',
    };

    return <span className={`badge badge-${stautsColors[status]}`}>{status}</span>;
  }

  renderTestResults = (outputObj) => {
    switch (outputObj.status) {
      case 'nothing':
        return ('Run your code!');
      case 'error':
        return (`You have some syntax errors: ${outputObj.result}`);
      case 'failure':
        if (Array.isArray(outputObj.result)) {
          return (`Test falls with arguments (${outputObj.result.join(', ')})`);
        }
        return (`Test falls with arguments (${outputObj.result})`);
      case 'success':
        return ('Yay! All tests are passed!!111');
      default:
        return 'Oops';
    }
  }

  parseOutput = (output) => {
    try {
      return JSON.parse(output || '{"result": "nothing", "status": "nothing"}');
    } catch (e) {
      return { result: 'something went wrong!', status: 'error' };
    }
  }

  render() {
    const { output } = this.props;
    const outputObj = this.parseOutput(output);

    return (
      <div style={{ height: '500px' }}>
        <h3>
          Check status {this.renderStatusBadge(outputObj.status)}
        </h3>
        <code>
          {this.renderTestResults(outputObj)}
        </code>
      </div>
    );
  }
}


export default ExecutionOutput;

