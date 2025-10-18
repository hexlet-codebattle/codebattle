import React from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';

import i18n from '../../../i18n';
import color from '../../config/statusColor';

const getMessage = status => {
  switch (status) {
    case 'timeout':
      return i18n.t("We couldn't retrieve check results. Check your network connection or your solution for bugs or :prod_is_down:");
    case 'error':
      return i18n.t('Solution cannot be executed');
    case 'failure':
      return i18n.t('Tests failed');
    case 'ok':
      return i18n.t('Yay! All tests passed!!111');
    default:
      return i18n.t('Press Check solution or press Give up');
  }
};

const OutputTab = ({ sideOutput, large = false }) => {
  const { successCount, assertsCount, status } = sideOutput;
  const isShowMessage = status === 'failure';
  const statusColor = color[status];
  const message = getMessage(status);
  const percent = Math.ceil((100 * successCount) / assertsCount);

  const assertsStatusMessage = i18n.t(
    'You passed %{successCount} from %{assertsCount} asserts. (%{percent}%)',
    { successCount, assertsCount, percent },
  );

  if (large) {
    const panelClassName = cn({
      'text-danger': status === 'error',
      'text-primary': status === 'failure',
      'text-success': status === 'ok',
    });

    return (
      status === 'ok'
        ? (
          <FontAwesomeIcon className="h2 text-warning" icon="trophy" />
        )
        : (
          <div title="Asserts status" className={panelClassName}>
            <h2>{status === 'error' ? 'Error' : `${percent}%`}</h2>
          </div>
        )
    );
  }

  return (
    <>
      {isShowMessage && <span className="font-weight-bold text-white small mr-3">{assertsStatusMessage}</span>}
      <span className={`p-2 text-white bg-${statusColor}`}>{message}</span>
    </>
  );
};

export default OutputTab;
