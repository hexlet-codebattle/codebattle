import React, { useEffect, useState } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import uniqueId from 'lodash/uniqueId';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';

import i18n from '../../i18n';
import color from '../config/statusColor';

const getMessage = status => {
  switch (status) {
    case 'error':
      return i18n.t('Solution cannot be executed');
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
  children,
  statusColor,
  assert,
  hasOutput,
  uniqIndex,
  executionTime,
  fontSize,
}) {
  const [isShowLog, setIsShowLog] = useState(true);
  const classCollapse = cn('collapse', {
    show: isShowLog,
  });

  const { result = assert.value } = assert;

  const fontClassName = cn({
    h5: fontSize === 1,
    h4: fontSize === 2,
    h3: fontSize === 3,
    h2: fontSize === 4,
    h1: fontSize > 4,
  });
  const assertClassName = cn('d-block', fontClassName);

  return (
    <div className="list-group-item border-left-0 gorder-right-0">
      <div id={`heading${uniqIndex}`}>
        <div>
          <div className="d-flex">
            {statusColor === 'success' ? (
              <FontAwesomeIcon
                className={`text-${statusColor} mr-2 ${fontClassName}`}
                icon="check-circle"
              />
            ) : (
              <FontAwesomeIcon
                className={`text-${statusColor} mr-2 ${fontClassName}`}
                icon="exclamation-circle"
              />
            )}
            <span className={`badge badge-${statusColor} mr-3 ${fontClassName}`}>{assert.status}</span>
            <OverlayTrigger
              overlay={<Tooltip id={assert.id}>Execution Time</Tooltip>}
              placement="top"
            >
              {executionTime !== undefined && Number(executionTime) !== 0 ? (
                <span className={`badge badge-secondary mr-3 ${fontClassName}`}>{executionTime}</span>
              ) : (<></>)}
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
                <span className={fontClassName}>
                  {isShowLog ? <FontAwesomeIcon icon="arrow-circle-up" /> : <FontAwesomeIcon icon="arrow-circle-down" />}
                  {' Log'}
                </span>
              </button>
            )}
          </div>
        </div>
        <pre className="my-1">
          <span className={assertClassName}>
            {`${i18n.t('Receive:')} ${result === undefined ? '???' : JSON.stringify(result)}`}
          </span>
          <span className={assertClassName}>
            {`${i18n.t('Expected:')} ${assert.expected === undefined ? '???' : JSON.stringify(assert.expected)}`}
          </span>
          <span className={assertClassName}>
            {`${i18n.t('Arguments:')} ${assert.arguments === undefined ? '???' : JSON.stringify(assert.arguments)}`}
          </span>
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

const Item = ({ output, fontSize }) => {
  if (output === '') {
    return null;
  }

  const fontClassName = cn({
    h5: fontSize === 1,
    h4: fontSize === 2,
    h3: fontSize === 3,
    h2: fontSize === 4,
    h1: fontSize > 4,
  });

  return (
    <div className={`alert alert-secondary mb-0 ${fontClassName}`}>
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
