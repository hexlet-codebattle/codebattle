import React, {
  memo, useState, useEffect,
} from 'react';

import cn from 'classnames';
import i18next from 'i18next';
import { useDispatch } from 'react-redux';

import { getResults } from '../../middlewares/TournamentAdmin';

const getCustomEventTrClassName = level => cn(
  'text-dark font-weight-bold cb-custom-event-tr cursor-pointer',
  {
    'cb-custom-event-bg-success': level === 'easy',
    'cb-custom-event-bg-orange': level === 'elementary',
    'cb-custom-event-bg-blue': level === 'medium',
    'cb-custom-event-bg-brown': level === 'hard',
  },
);

const tableDataCellClassName = cn(
  'p-1 pl-4 my-2 align-middle text-nowrap position-relative cb-custom-event-td border-0',
);

function TaskRankingPanel({ type, state, handleTaskSelectClick }) {
  const dispatch = useDispatch();

  const [items, setItems] = useState([]);

  useEffect(() => {
    if (state === 'active') {
      dispatch(getResults(type, undefined, setItems));

      const interval = setInterval(() => {
        dispatch(getResults(type, undefined, setItems));
      }, 1000 * 30);

      return () => {
        clearInterval(interval);
      };
    }

    if (state === 'finished') {
      dispatch(getResults(type, undefined, setItems));
    }

    return () => {};
  }, [setItems, dispatch, type, state]);

  return (
    <div className="my-2 px-1 mt-lg-0 sticky-top rounded-lg position-relative cb-overflow-x-auto cb-overflow-y-auto">
      <table className="table table-striped cb-custom-event-table">
        <thead className="text-muted">
          <tr>
            <th className="p-1 pl-4 font-weight-light border-0">
              {i18next.t('Task')}
            </th>
            <th className="p-1 pl-4 font-weight-light border-0">
              {i18next.t('Count of solutions')}
            </th>
            <th className="p-1 pl-4 font-weight-light border-0">
              {i18next.t('Fastest time to solve task (sec)')}
            </th>
            <th className="p-1 pl-4 font-weight-light border-0">
              {i18next.t('25% (sec)')}
            </th>
            <th className="p-1 pl-4 font-weight-light border-0">
              {i18next.t('50% (sec)')}
            </th>
            <th className="p-1 pl-4 font-weight-light border-0">
              {i18next.t('75% (sec)')}
            </th>
            <th className="p-1 pl-4 font-weight-light border-0">
              {i18next.t('85% (sec)')}
            </th>
            <th className="p-1 pl-4 font-weight-light border-0">
              {i18next.t('95% (sec)')}
            </th>
            <th className="p-1 pl-4 font-weight-light border-0">
              {i18next.t('Slowest time to solve task (sec)')}
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <React.Fragment key={`${type}-task-${item.taskId}`}>
              <tr className="cb-custom-event-empty-space-tr" />
              <tr onClick={handleTaskSelectClick} data-task-id={item.taskId} className={getCustomEventTrClassName(item.level)}>
                <td
                  title={item.name}
                  className={tableDataCellClassName}
                >
                  <div
                    className="cb-custom-event-name mr-1"
                    style={{ maxWidth: 220 }}
                  >
                    {item.name}
                  </div>
                </td>
                <td width="120" className={tableDataCellClassName}>
                  {item.winsCount}
                </td>
                <td width="120" className={tableDataCellClassName}>
                  {item.min}
                </td>
                <td width="120" className={tableDataCellClassName}>
                  {item.p5}
                </td>
                <td width="120" className={tableDataCellClassName}>
                  {item.p25}
                </td>
                <td width="120" className={tableDataCellClassName}>
                  {item.p50}
                </td>
                <td width="120" className={tableDataCellClassName}>
                  {item.p75}
                </td>
                <td width="120" className={tableDataCellClassName}>
                  {item.p95}
                </td>
                <td width="120" className={tableDataCellClassName}>
                  {item.max}
                </td>
              </tr>
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default memo(TaskRankingPanel);
