import React, { useEffect, useState } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import uniqueId from 'lodash/uniqueId';
import Tooltip from 'react-bootstrap/Tooltip';

import OverlayTrigger from '@/components/OverlayTriggerCompat';

import i18n from '../../i18n';
import statusColorMap from '../config/statusColor';

const color = statusColorMap as Record<string, string>;

interface Assert {
  id?: string | number;
  status: string;
  // assert value/result/expected/arguments are arbitrary test-case data
  // (any JSON shape) interpolated into strings for display.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expected?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  arguments?: any;
  output?: string;
}

interface ResultData {
  status: string;
}

const getMessage = (status: string) => {
  switch (status) {
    case 'error':
      return i18n.t('Solution cannot be executed');
    case 'failure':
      return i18n.t('Test failed');
    case 'ok':
      return i18n.t('Yay! All tests passed!');
    default:
      return i18n.t('Opponent tests');
  }
};

interface AccordeonBoxProps {
  children: React.ReactNode;
}

interface AccordeonBoxComponent extends React.FC<AccordeonBoxProps> {
  Item: typeof Item;
  Menu: typeof Menu;
  SubMenu: typeof SubMenu;
}

const AccordeonBox = (({ children }: AccordeonBoxProps) => {
  return (
    <div className="accordion border-top cb-border-color" id="accordionExample">
      {children}
    </div>
  );
}) as AccordeonBoxComponent;

const renderFirstAssert = (firstAssert: Assert) => (
  <AccordeonBox.SubMenu
    statusColor={color[firstAssert.status]}
    assert={firstAssert}
    hasOutput={firstAssert.output}
  >
    <AccordeonBox.Item output={firstAssert.output} />
  </AccordeonBox.SubMenu>
);

interface MenuProps {
  children: React.ReactNode;
  firstAssert?: Assert;
  resultData: ResultData;
  assertsCount: number;
  successCount: number;
}

function Menu({ children, firstAssert, resultData, assertsCount, successCount }: MenuProps) {
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
  const assertsStatusMessage = i18n.t(
    'You passed %{successCount} from %{assertsCount} asserts. (%{percent}%)',
    {
      successCount,
      assertsCount,
      percent,
    },
  );

  useEffect(() => {
    setShow(isSyntaxError);
  }, [isSyntaxError]);

  return (
    <div className="card cb-card border-0 rounded-0">
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
              {show ? (
                <FontAwesomeIcon icon="arrow-circle-up" />
              ) : (
                <FontAwesomeIcon icon="arrow-circle-down" />
              )}
            </button>
            {!isSyntaxError && (
              <span className="font-weight-bold small mr-3">{assertsStatusMessage}</span>
            )}
            <span className={`badge badge-${statusColor}`}>{message}</span>
          </div>
          {firstAssert && renderFirstAssert(firstAssert)}
        </>
      ) : (
        <span className={`badge badge-${statusColor}`}>{message}</span>
      )}
      <div
        id={`collapse${uniqIndex}`}
        className={classCollapse}
        aria-labelledby={`heading${uniqIndex}`}
      >
        <div className="list-group list-group-flush">{children}</div>
      </div>
    </div>
  );
}

interface SubMenuProps {
  children?: React.ReactNode;
  statusColor?: string;
  assert: Assert;
  hasOutput?: React.ReactNode;
  uniqIndex?: string | number;
  executionTime?: number | string;
  fontSize?: number;
}

function SubMenu({
  children,
  statusColor,
  assert,
  hasOutput,
  uniqIndex,
  executionTime,
  fontSize = 0,
}: SubMenuProps) {
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
    <div className="list-group-item border-left-0 cb-border-color border-right-0 cb-bg-highlight-panel text-white">
      <div id={`heading${uniqIndex}`}>
        <div>
          <div className="d-flex align-items-center">
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
            <span className={`badge badge-${statusColor} mr-3 ${fontClassName}`}>
              {assert.status}
            </span>
            <OverlayTrigger
              overlay={<Tooltip id={String(assert.id)}>Execution Time</Tooltip>}
              placement="top"
            >
              {executionTime !== undefined && Number(executionTime) !== 0 ? (
                <span className={`badge badge-secondary mr-3 ${fontClassName}`}>
                  {executionTime}
                </span>
              ) : (
                <></>
              )}
            </OverlayTrigger>
            {assert.output && (
              <button
                className="btn btn-sm btn-outline-info badge rounded-lg"
                type="button"
                onClick={() => setIsShowLog(!isShowLog)}
                data-toggle="collapse"
                aria-expanded="true"
                aria-controls={`collapse${uniqIndex}`}
              >
                <span className={fontClassName}>
                  <FontAwesomeIcon
                    icon={isShowLog ? 'arrow-circle-up' : 'arrow-circle-down'}
                    className="mr-1"
                  />
                  {i18n.t('STDOUT')}
                </span>
              </button>
            )}
          </div>
        </div>
        <pre className="my-1">
          {(() => {
            const labels = [i18n.t('Receive:'), i18n.t('Expected:'), i18n.t('Arguments:')];
            const width = Math.max(...labels.map((l) => l.length));
            const [receiveLabel, expectedLabel, argumentsLabel] = labels.map((l) =>
              l.padEnd(width),
            );
            return (
              <>
                <span className={assertClassName}>{`${receiveLabel} ${result}`}</span>
                <span className={assertClassName}>{`${expectedLabel} ${assert.expected}`}</span>
                <span className={assertClassName}>{`${argumentsLabel} ${assert.arguments}`}</span>
              </>
            );
          })()}
        </pre>
        {hasOutput && (
          <div
            id={`collapse${uniqIndex}`}
            className={classCollapse}
            aria-labelledby={`heading${uniqIndex}`}
          >
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

interface ItemProps {
  output?: string;
  fontSize?: number;
}

function Item({ output, fontSize = 0 }: ItemProps) {
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
    <div className={`alert text-white mb-0 ${fontClassName}`}>
      <pre>{output}</pre>
    </div>
  );
}

AccordeonBox.Item = Item;
AccordeonBox.Menu = Menu;
AccordeonBox.SubMenu = SubMenu;
export default AccordeonBox;
