import React from 'react';

import cn from 'classnames';

import i18n from '../../../i18n';
import color from '../../config/statusColor';

const getMessage = status => {
  switch (status) {
    case 'timeout':
      return i18n.t("We couldn't retrieve check results. Check your network connection or your solution for bugs or :prod_is_down:");
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

const OutputTab = ({ sideOutput, large = false }) => {
  const { successCount, assertsCount, status } = sideOutput;
  const isShowMessage = status === 'failure';
  const statusColor = color[status];
  const message = getMessage(status);
  const percent = (100 * successCount) / assertsCount;

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
      <div title="Asserts status" className={panelClassName}>
        <h2>{status === 'error' ? 'Error' : `${percent}%`}</h2>
      </div>
    );
  }

  return (
    <>
      {isShowMessage && <span className="font-weight-bold small mr-3">{assertsStatusMessage}</span>}
      <span className={`p-2 bg-${statusColor}`}>{message}</span>
    </>
  );
};

export default OutputTab;
