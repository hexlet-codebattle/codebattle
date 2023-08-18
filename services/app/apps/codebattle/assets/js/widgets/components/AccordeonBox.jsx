import React, { useEffect, useState } from 'react';
import Tooltip from 'react-bootstrap/Tooltip';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import cn from 'classnames';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import uniqueId from 'lodash/uniqueId';
import i18n from '../../i18n';
import color from '../config/statusColor';

const getMessage = status => {
  switch (status) {
    case 'error':
      return i18n.t('solution cannot be executed');
    case 'failure':
      return i18n.t('Test failed');
    case 'ok':
      return i18n.t('Yay! All tests passed!!111');
    default:
      return i18n.t('Press Check solution or press Give up');
  }
};

const AccordeonBox = ({ children }) => (
  <div className="accordion border-top" id="accordionExample">
    {children}
  </div>
);

const renderFirstAssert = firstAssert => (
  <AccordeonBox.SubMenu statusColor={color[firstAssert.status]} assert={firstAssert} hasOutput={firstAssert.output}>
    <AccordeonBox.Item output={firstAssert.output} />
  </AccordeonBox.SubMenu>
);

function Menu({
 children, firstAssert, resultData, assertsCount, successCount,
}) {
  const [show, setShow] = useState(true);
  const isSyntaxError = resultData.status === 'error';
  const statusColor = color[resultData.status];
  const message = getMessage(resultData.status);
  const classCollapse = cn('collapse', { show });
  const handleClick = () => {
    setShow(!show);
  };
  const uniqIndex = uniqueId('heading');
  const percent = (100 * successCount) / assertsCount;
  const assertsStatusMessage = i18n.t('You passed %{successCount} from %{assertsCount} asserts. (%{percent}%)', {
    successCount,
    assertsCount,
    percent,
  });

  useEffect(() => {
    setShow(isSyntaxError);
  }, [isSyntaxError]);

  return (
    <div className="card border-0 rounded-0">
      {statusColor === 'warning' || statusColor === 'danger' ? (
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
              {show ? <FontAwesomeIcon icon="arrow-circle-up" /> : <FontAwesomeIcon icon="arrow-circle-down" />}
            </button>
            {!isSyntaxError && <span className="font-weight-bold small mr-3">{assertsStatusMessage}</span>}
            <span className={`badge badge-${statusColor}`}>{message}</span>
          </div>
          {firstAssert && renderFirstAssert(firstAssert)}
        </>
      ) : (
        <>
          <span className={`badge badge-${statusColor}`}>{message}</span>
        </>
      )}
      <div id={`collapse${uniqIndex}`} className={classCollapse} aria-labelledby={`heading${uniqIndex}`}>
        <div className="list-group list-group-flush">{children}</div>
      </div>
    </div>
  );
}

function SubMenu({
 children, statusColor, assert, hasOutput, uniqIndex, executionTime,
}) {
  const [isShowLog, setIsShowLog] = useState(true);
  const classCollapse = cn('collapse', {
    show: isShowLog,
  });

  const { result = assert.value } = assert;

  return (
    <div className="list-group-item">
      <div id={`heading${uniqIndex}`}>
        <div>
          <div>
            {statusColor === 'success' ? (
              <FontAwesomeIcon className={`text-${statusColor} mr-2`} icon="check-circle" />
            ) : (
              <FontAwesomeIcon className={`text-${statusColor} mr-2`} icon="exclamation-circle" />
            )}
            <div className={`badge badge-${statusColor} mr-3`}>{assert.status}</div>
            <OverlayTrigger
              overlay={<Tooltip id={assert.id}>Execution Time</Tooltip>}
              placement="top"
            >
              <div className="badge badge-secondary mr-3">{executionTime}</div>
            </OverlayTrigger>
            {assert.output && (
              <button
                className="btn btn-sm btn-outline-info badge ml-2"
                type="button"
                onClick={() => setIsShowLog(!isShowLog)}
                data-toggle="collapse"
                aria-expanded="true"
                aria-controls={`collapse${uniqIndex}`}
              >
                <span>
                  {isShowLog ? <FontAwesomeIcon icon="arrow-circle-up" /> : <FontAwesomeIcon icon="arrow-circle-down" />}
                  {' Log'}
                </span>
              </button>
            )}
          </div>
        </div>
        <pre className="my-1">
          <span className="d-block">{`${i18n.t('Receive:')} ${JSON.stringify(result)}`}</span>
          <span className="d-block">{`${i18n.t('Expected:')} ${JSON.stringify(assert.expected)}`}</span>
          <span className="d-block">{`${i18n.t('Arguments:')} ${JSON.stringify(assert.arguments)}`}</span>
        </pre>
        {hasOutput && (
          <>
            <div id={`collapse${uniqIndex}`} className={classCollapse} aria-labelledby={`heading${uniqIndex}`}>
              {children}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const Item = ({ output }) => {
  if (output === '') {
    return null;
  }

  return (
    <div className="alert alert-secondary mb-0">
      <pre>
        <span className="font-weight-bold d-block">Output:</span>
        {output}
      </pre>
    </div>
  );
};

AccordeonBox.Item = Item;
AccordeonBox.Menu = Menu;
AccordeonBox.SubMenu = SubMenu;
export default AccordeonBox;
