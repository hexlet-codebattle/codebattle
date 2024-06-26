/* eslint-disable no-bitwise */
// import React from 'react';

// import cn from 'classnames';
// import { registerRulesForLanguage } from 'monaco-ace-tokenizer';
// import { initVimMode } from 'monaco-vim';
// import PropTypes from 'prop-types';
// import MonacoEditor from 'react-monaco-editor';

import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import customTheme from '../config/customTheme.json';
import {
  gameIdSelector,
  gameModeSelector,
  gameLockedSelector,
} from '../selectors/index';
import { actions } from '../slices';

import Editor from './Editor';

class ExtendedEditor extends Editor {
  static propTypes = {
    ...Editor.propTypes,
    monacoTheme: PropTypes.string,
    fontFamly: PropTypes.string || undefined,
  };

  static defaultProps = {
    ...Editor.defaultProps,
    monacoTheme: 'default',
    fontFamly: undefined,
  }

  constructor(props) {
    super(props);

    this.options = {
      fontFamily: props.fontFamily,
      ...this.options,
    };
  }

  async componentDidMount() {
    super.componentDidMount();

    const { monacoTheme } = this.props;
    const { monaco } = this;

    if (monacoTheme === 'custom') {
      monaco.editor.defineTheme(monacoTheme, customTheme);
      monaco.editor.setTheme(monacoTheme);
    } else if (monacoTheme !== 'default') {
      import(`monaco-themes/themes/${monacoTheme}.json`)
        .then(data => {
          const themeName = monacoTheme.split(' ').join('-');
          monaco.editor.defineTheme(themeName, data);
          monaco.editor.setTheme(themeName);
        })
        .catch(err => {
          console.error(err);
        });
    }
  }

  async componentDidUpdate(prevProps, prevState) {
    super.componentDidUpdate(prevProps, prevState);

    const { monacoTheme } = this.props;
    const { monaco } = this;

    if (monacoTheme
      && monacoTheme !== prevProps.monacoTheme
      && monacoTheme === 'custom'
    ) {
      monaco.editor.defineTheme(monacoTheme, customTheme);
      monaco.editor.setTheme(monacoTheme);
    } else if (monacoTheme
      && monacoTheme !== prevProps.monacoTheme
      && monacoTheme !== 'default'
    ) {
      import(`monaco-themes/themes/${monacoTheme}.json`)
        .then(data => {
          const themeName = monacoTheme.split(' ').join('-');
          monaco.editor.defineTheme(themeName, data);
          monaco.editor.setTheme(themeName);
        })
        .catch(err => {
          console.error(err);
        });
    }
  }

  componentWillUnmount() {
    super.componentWillUnmount();
  }
}

const mapStateToProps = state => {
  const gameId = gameIdSelector(state);
  const gameMode = gameModeSelector(state);
  const locked = gameLockedSelector(state);
  return {
    gameId,
    gameMode,
    locked,
    mute: state.user.settings.mute,
  };
};

const mapDispatchToProps = { toggleMuteSound: actions.toggleMuteSound };

export default connect(mapStateToProps, mapDispatchToProps)(ExtendedEditor);
