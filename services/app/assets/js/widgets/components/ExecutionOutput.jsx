import React from 'react';
import PropTypes from 'prop-types';

const ExecutionOutput = ({ output }) => (
    <code>
      {output}
    </code>
);

ExecutionOutput.propTypes = {
  output: PropTypes.string.isRequired,
};

export default ExecutionOutput;

