import React from 'react';
import _ from 'lodash';
import { connect } from 'react-redux';
import { setEditorsMode } from '../actions';
import { editorsModeSelector } from '../selectors';


const getModeTitle = typeMode => (<span className="mx-1">{`${_.capitalize(typeMode)} Mode`}</span>);

const EditorsModeToggle = (props) => {
  const {
    setMode, currentMode,
  } = props;
  const modes = ['default', 'vim'];

  return (
    <div className="dropdown ml-2">
      <button
        className="btn btn-sm border btn-light dropdown-toggle"
        type="button"
        id="dropdownLangButton"
        data-toggle="dropdown"
        aria-haspopup="true"
        aria-expanded="false"
      >
        {getModeTitle(currentMode)}
      </button>
      <div className="dropdown-menu" aria-labelledby="dropdownLangButton">
        {modes.map(mode => (
          <button
            type="button"
            className="dropdown-item btn rounded-0"
            key={mode}
            onClick={() => setMode(mode)}
          >
            {getModeTitle(mode)}
          </button>
        ))}
      </div>
    </div>
  );
};

const mapStateToProps = state => ({
  currentMode: editorsModeSelector(state),
});

const mapDispatchToProps = {
  setMode: setEditorsMode,
};

export default connect(mapStateToProps, mapDispatchToProps)(EditorsModeToggle);
