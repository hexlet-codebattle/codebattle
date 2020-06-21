import React, { useState } from 'react';
import cn from 'classnames';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import _ from 'lodash';
import i18n from '../../../i18n';
import color from '../../config/statusColor';

const AccordeonBox = ({ children }) => (
  <div className="accordion border-top" id="accordionExample">
    { children }
  </div>
);


const Menu = ({
  count, children, statusColor, message, firstAssert,
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
    <div className="card border-0 rounded-0">
      {(statusColor === 'warning' || statusColor === 'danger')
        ? (
          <>
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
              <span className="font-weight-bold small mr-3">{count}</span>
              <span className={`badge badge-${statusColor}`}>{message}</span>
            </div>
            {firstAssert && (
            <AccordeonBox.SubMenu
              statusColor={color[firstAssert.status]}
              assert={firstAssert}
              hasOutput={firstAssert.output}
            >
              <AccordeonBox.Item
                output={firstAssert.output}
              />
            </AccordeonBox.SubMenu>
            )}
          </>
        ) : <span className={`badge badge-${statusColor}`}>{message}</span>}
      <div id={`collapse${uniqIndex}`} className={classCollapse} aria-labelledby={`heading${uniqIndex}`}>
        <div className="list-group list-group-flush">
          {children}
        </div>
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
    <div className="list-group-item">
      <div id={`heading${uniqIndex}`}>
        <div className="border-bottom d-flex pb-2">
          {statusColor === 'success'
            ? <FontAwesomeIcon className={`text-${statusColor} mr-2`} icon="check-circle" />
            : <FontAwesomeIcon className={`text-${statusColor} mr-2`} icon="exclamation-circle" />}

          <span className={`badge badge-${statusColor} mr-3`}>{assert.status}</span>
          {assert.execution_time ? (
            <span className="font-weight-bold small ml-auto">
              {i18n.t('execution time: %{time} ms', { time: assert.execution_time })}
            </span>
          ) : null}
        </div>
        <pre className="my-2">
          <span className="d-block">{`${i18n.t('Receive:')} ${JSON.stringify(assert.result)}`}</span>
          <span className="d-block">{`${i18n.t('Expected:')} ${JSON.stringify(assert.expected)}`}</span>
          <span className="d-block">{`${i18n.t('Arguments:')} ${JSON.stringify(assert.arguments)}`}</span>
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
          <div className="mt-3">
            {children}
          </div>
        </div>
      ) : null}
    </div>
  );
};


const Item = ({ output, result = null }) => (
  <div className="alert alert-secondary mb-0">
    {result ? (
      <pre className="border-bottom border-dark card-text pb-3">
        <span className="font-weight-bold d-block">Result:</span>
        {result}
      </pre>
    ) : null}

    <pre className="card-text">
      <span className="font-weight-bold d-block">Output:</span>
      {output}
    </pre>
  </div>
);


AccordeonBox.Item = Item;
AccordeonBox.Menu = Menu;
AccordeonBox.SubMenu = SubMenu;
export default AccordeonBox;
