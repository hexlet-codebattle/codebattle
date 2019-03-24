import React from 'react';

const Toast = (props) => {
  const { children, header } = props;
  return (
    <div className="toast show">
      <div className="toast-header">
        <strong className="mr-auto">{ header }</strong>
      </div>
      <div className="toast-body">
        { children }
      </div>
    </div>
  );
};

Toast.defaultProps = {
  header: 'Notification',
  children: 'Default',
};

export default Toast;
