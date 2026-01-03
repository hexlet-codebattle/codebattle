import React, { Component } from 'react';

import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import customTheme from '../config/customTheme.json';
import {
  gameIdSelector,
  gameModeSelector,
  gameLockedSelector,
} from '../selectors/index';
import { actions } from '../slices';

class ExtendedEditor extends Component {
  static propTypes = {
    monacoTheme: PropTypes.string,
    fontFamily: PropTypes.string, // corrected prop name
  };

  static defaultProps = {
    monacoTheme: 'default',
    fontFamily: undefined,
  };

  constructor(props) {
    super(props);
    this.options = {
      fontFamily: props.fontFamily,
      ...this.options,
    };
  }

  async componentDidMount() {
    // If there's a need to call the parent method, ensure it exists.
    if (super.componentDidMount) {
      super.componentDidMount();
    }

    const { monacoTheme } = this.props;
    const { monaco } = this;

    if (monacoTheme === 'custom') {
      monaco.editor.defineTheme(monacoTheme, customTheme);
      monaco.editor.setTheme(monacoTheme);
    } else if (monacoTheme !== 'default') {
      import(`monaco-themes/themes/${monacoTheme}.json`)
        .then((data) => {
          const themeName = monacoTheme.split(' ').join('-');
          monaco.editor.defineTheme(themeName, data);
          monaco.editor.setTheme(themeName);
        })
        .catch((err) => {
          console.error(err);
        });
    }
  }

  async componentDidUpdate(prevProps, prevState) {
    if (super.componentDidUpdate) {
      super.componentDidUpdate(prevProps, prevState);
    }

    const { monacoTheme } = this.props;
    const { monaco } = this;

    if (
      monacoTheme
      && monacoTheme !== prevProps.monacoTheme
      && monacoTheme === 'custom'
    ) {
      monaco.editor.defineTheme(monacoTheme, customTheme);
      monaco.editor.setTheme(monacoTheme);
    } else if (
      monacoTheme
      && monacoTheme !== prevProps.monacoTheme
      && monacoTheme !== 'default'
    ) {
      import(`monaco-themes/themes/${monacoTheme}.json`)
        .then((data) => {
          const themeName = monacoTheme.split(' ').join('-');
          monaco.editor.defineTheme(themeName, data);
          monaco.editor.setTheme(themeName);
        })
        .catch((err) => {
          console.error(err);
        });
    }
  }

  componentWillUnmount() {
    if (super.componentWillUnmount) {
      super.componentWillUnmount();
    }
  }

  render() {
    // Implement your render method here
    return <></>;
  }
}

const mapStateToProps = (state) => {
  const gameId = gameIdSelector(state);
  const gameMode = gameModeSelector(state);
  const locked = gameLockedSelector(state);
  return {
    gameId,
    roomMode: gameMode,
    locked,
    mute: state.user.settings.mute,
  };
};

const mapDispatchToProps = { toggleMuteSound: actions.toggleMuteSound };

export default connect(mapStateToProps, mapDispatchToProps)(ExtendedEditor);
