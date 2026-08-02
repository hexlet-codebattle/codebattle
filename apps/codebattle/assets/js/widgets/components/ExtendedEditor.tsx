import React, { Component } from 'react';

import { connect } from 'react-redux';

import type { RootState } from '@/slices/store';

import customTheme from '../config/customTheme.json';
import { gameIdSelector, gameModeSelector, gameLockedSelector } from '../selectors/index';
import { toggleMuteSound } from '../slices/user';

interface ExtendedEditorProps {
  monacoTheme?: string;
  fontFamily?: string; // corrected prop name
}

class ExtendedEditor extends Component<ExtendedEditorProps> {
  static defaultProps = {
    monacoTheme: 'default',
    fontFamily: undefined,
  };

  // Monaco editor internals are typed loosely (no shared type here).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options: any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  monaco: any;

  constructor(props: ExtendedEditorProps) {
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
          const themeName = monacoTheme?.split(' ').join('-');
          monaco.editor.defineTheme(themeName, data);
          monaco.editor.setTheme(themeName);
        })
        .catch((err) => {
          console.error(err);
        });
    }
  }

  async componentDidUpdate(prevProps: ExtendedEditorProps, prevState: Readonly<{}>) {
    if (super.componentDidUpdate) {
      super.componentDidUpdate(prevProps, prevState);
    }

    const { monacoTheme } = this.props;
    const { monaco } = this;

    if (monacoTheme && monacoTheme !== prevProps.monacoTheme && monacoTheme === 'custom') {
      monaco.editor.defineTheme(monacoTheme, customTheme);
      monaco.editor.setTheme(monacoTheme);
    } else if (monacoTheme && monacoTheme !== prevProps.monacoTheme && monacoTheme !== 'default') {
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

const mapStateToProps = (state: RootState) => {
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

const mapDispatchToProps = { toggleMuteSound };

export default connect(mapStateToProps, mapDispatchToProps)(ExtendedEditor);
