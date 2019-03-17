import React from 'react';

export default class Toast extends React.Component {
  static defaultProps = {
    header: 'Notification',
    children: 'Default',
  }
  
  render () {
    const { children, header } = this.props;
    return(
      <div className="toast show">
        <div className="toast-header">
          <strong className="mr-auto">{ header }</strong>
        </div>
        <div className="toast-body">
          { children }
        </div>
      </div>
    );
  }
}
