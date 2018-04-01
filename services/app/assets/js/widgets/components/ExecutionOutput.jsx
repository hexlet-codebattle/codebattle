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

  parseOutput = (output) => {
    try {
      return JSON.parse(output || '{"result": "nothing", "status": "nothing"}');
    }
    catch(e) {
      return {result: "something went wrong!", status: "error"};
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
          Tests result: {outputObj.result}
        </code>
      </div>
    );
  }
}


export default ExecutionOutput;

