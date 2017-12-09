import React from 'react';
import PropTypes from 'prop-types';
import GameWidget from './GameWidget';
import ChatWidget from './ChatWidget';

const RootContainer = (props) => {
  props.startup();
  return (
    <div>
      <GameWidget />
      <ChatWidget />
    </div>
  );
};

RootContainer.propTypes = {
  startup: PropTypes.func.isRequired,
};

export default RootContainer;
