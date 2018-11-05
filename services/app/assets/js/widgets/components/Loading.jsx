import React, { Component } from 'react';
import ReactLoading from 'react-loading';

export default class Messages extends Component {
  render() {
    return (
      <div className="d-flex my-0 py-1 justify-content-center" >
        <ReactLoading type="spin" color="#6c757d" height={50} width={50} />
      </div>
    );
  }
}
