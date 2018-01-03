import React from 'react';
import PropTypes from 'prop-types';

const ExecutionOutput = ({ output }) => (
  <div className="card">
    <div className="card-body">
      <code>
        {output}
      </code>
    </div>
  </div>
);

ExecutionOutput.propTypes = {
  output: PropTypes.string.isRequired,
};

export default ExecutionOutput;

