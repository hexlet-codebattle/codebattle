import React from 'react';
import PropTypes from 'prop-types';
import GameWidget from './GameWidget';

const RootContainer = (props) => {
  props.startup();
  return (<GameWidget />);
};

RootContainer.propTypes = {
  startup: PropTypes.func.isRequired,
};

export default RootContainer;
