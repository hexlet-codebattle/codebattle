import React, { useState } from 'react';
import cn from 'classnames';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import _ from 'lodash';


const AccordeonBox = ({ children }) => (
  <div className="accordion card-body border-top" id="accordionExample">
    { children }
  </div>
);


const Menu = ({
  count = 0, children, statusColor, message,
}) => {
  const [show, setShow] = useState(false);
  const classCollapse = cn('collapse', {
    show,
  });
  const handleClick = () => {
    setShow(!show);
  };
  const uniqIndex = _.uniqueId('heading');

  return (
    <div className="card">
      {(statusColor === 'warning' || statusColor === 'danger')
        ? (
          <div className="card-header" id={`heading${uniqIndex} `}>
            <button
              className="btn btn-sm btn-outline-secondary mr-3"
              type="button"
              onClick={handleClick}
              data-toggle="collapse"
              aria-expanded="true"
              aria-controls={`collapse${uniqIndex}`}
            >
              { show ? <FontAwesomeIcon icon="arrow-circle-up" /> : <FontAwesomeIcon icon="arrow-circle-down" /> }
            </button>
            <span className="badge mr-3">{count}</span>
            <span className={`badge badge-${statusColor}`}>{message}</span>
          </div>
        ) : <span className={`badge badge-${statusColor}`}>{message}</span>}
      <div id={`collapse${uniqIndex}`} className={classCollapse} aria-labelledby={`heading${uniqIndex}`}>
        {children}
      </div>

    </div>
  );
};


const SubMenu = ({
  children, statusColor, assert, hasOutput,
}) => {
  const [show, setShow] = useState(false);
  const classCollapse = cn('collapse', {
    show,
  });
  const handleClick = () => {
    setShow(!show);
  };
  const uniqIndex = _.uniqueId('heading');

  return (
    <div className="card ">

      <div className="card-header" id={`heading${uniqIndex}`}>
        {statusColor === 'success'
          ? <FontAwesomeIcon className={`text-${statusColor} mr-2`} icon="check-circle" />
          : <FontAwesomeIcon className={`text-${statusColor} mr-2`} icon="exclamation-circle" />}

        <span className={`badge badge-${statusColor} mr-3`}>{assert.status}</span>
        {assert.execution_time ? (
          <span className="badge ml-auto">
            {`executionTime: ${assert.execution_time} ms`}
          </span>
        ) : null}
        <pre className="mt-2">
          {assert.result !== undefined ? <span className="d-block">{`Receive: ${assert.result}`}</span> : null}
          {assert.expected !== undefined ? <span className="d-block">{`Expected: ${assert.expected}`}</span> : null}
          {assert.arguments !== undefined ? <span className="d-block">{`Arguments: [${assert.arguments}]`}</span> : null}
        </pre>
        {hasOutput ? (
          <button
            className="btn btn-sm btn-outline-secondary mr-3"
            type="button"
            onClick={handleClick}
            data-toggle="collapse"
            aria-expanded="true"
            aria-controls={`collapse${uniqIndex}`}
          >
            <span className="mr-2">Output </span>
            { show ? <FontAwesomeIcon icon="arrow-circle-up" /> : <FontAwesomeIcon icon="arrow-circle-down" /> }

          </button>
        ) : null}
      </div>


      {hasOutput ? (
        <div id={`collapse${uniqIndex}`} className={classCollapse} aria-labelledby={`heading${uniqIndex}`}>
          {children}
        </div>
      ) : null}

    </div>
  );
};


const Item = ({ output, result }) => (
  <>
    {output ? (
      <div className="card-body ">
        <span>
          {result ? (
            <pre className="card-text d-none d-md-block mt-3">
              Result:
              {'\n'}
              {result}
            </pre>
          ) : null}

          <pre className="card-text d-none d-md-block mt-3">
            Output:
            {'\n'}
            {output}
          </pre>

        </span>

      </div>
    ) : null}
  </>
);


AccordeonBox.Item = Item;
AccordeonBox.Menu = Menu;
AccordeonBox.SubMenu = SubMenu;
export default AccordeonBox;
