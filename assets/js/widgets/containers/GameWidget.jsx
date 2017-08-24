import React, { Component } from 'react';
import Editor from './Editor';


class GameWidget extends Component {
  render() {
    return (
      <div className="row mt-3 mx-auto">
        <div className="col-md-6">
          <Editor />
        </div>
      </div>
    );
  }
}

export default GameWidget;

