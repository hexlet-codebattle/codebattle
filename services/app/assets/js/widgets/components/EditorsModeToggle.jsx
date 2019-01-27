import React from 'react';
import _ from 'lodash';
import { connect } from 'react-redux';
import {
  toggleDefaultMode,
  toggleVimMode,
} from '../actions';
import { editorsModeSelector } from '../selectors';


const getModeTitle = typeMode => (<span className="mx-1">{`${_.capitalize(typeMode)} Mode`}</span>);

const EditorsModeToggle = (props) => {
  const {
    toggleDefault, toggleVim, currentMode,
  } = props;
  const modes = [
    {
      type: 'default',
      action: toggleDefault,
    },
    {
      type: 'vim',
      action: toggleVim,
    },
  ];

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
        {modes.map(({ type, action }) => (
          <button
            type="button"
            className="dropdown-item btn rounded-0"
            key={type}
            onClick={() => action()}
          >
            {getModeTitle(type)}
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
  toggleVim: toggleVimMode,
  toggleDefault: toggleDefaultMode,
};

export default connect(mapStateToProps, mapDispatchToProps)(EditorsModeToggle);
