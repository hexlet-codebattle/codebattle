import React from 'react';

export default class ActionAfterGame extends React.Component {
  handleRematch = () => {
    console.log('============REMATCH=============');
  }

  handleNewGame = () => {
    console.log('============NEW GAME=============');
  }

  render () {
    return(
      <React.Fragment>
        <button
          type="button"
          className="btn btn-secondary btn-block"
          onClick={this.handleRematch}
        >
          Rematch
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-block"
          onClick={this.handleNewGame}
        >
          New Game
        </button>
      </React.Fragment>
    );
  }
}
