import React, {
  memo, useEffect, useRef, useCallback,
} from 'react';

import cn from 'classnames';
import moment from 'moment';
import { useDispatch, useSelector } from 'react-redux';

import GameLevelBadge from '../../components/GameLevelBadge';
import Loading from '../../components/Loading';
import ResultIcon from '../../components/ResultIcon';
import HorizontalScrollControls from '../../components/SideScrollControls';
import UserInfo from '../../components/UserInfo';
import fetchionStatuses from '../../config/fetchionStatuses';
import { completedGamesSelector } from '../../selectors';
import { fetchCompletedGames, loadNextPage } from '../../slices/completedGames';
import getGamePlayersData from '../../utils/gamePlayers';

import GameCard from './GameCard';

const commonTableClassName = 'table table-striped mb-0';
const commonClassName = 'table-responsive d-none d-md-block mvh-100 cb-overflow-y-scroll';

const InfiniteScrollableGames = memo(({ className, tableClassName, games }) => {
  const dispatch = useDispatch();
  const tableRef = useRef(null);

  useEffect(() => {
    const observableTable = tableRef.current;

    const onTableScroll = () => {
      const height = tableRef.current.scrollHeight - tableRef.current.parentElement?.offsetHeight;
      const delta = height - tableRef.current.scrollTop;

      if (delta < 500) {
        dispatch(loadNextPage());
      }
    };

    observableTable.addEventListener('scroll', onTableScroll);

    return () => {
      observableTable.removeEventListener('scroll', onTableScroll);
    };
  }, [dispatch]);

  const onCardsScroll = useCallback(cardList => {
    const width = cardList.scrollWidth - cardList.parentElement?.offsetWidth;
    const delta = width - cardList.scrollLeft;

    if (delta < 500) {
      dispatch(loadNextPage());
    }
  }, [dispatch]);

  return (
    <>
      <div ref={tableRef} className={className} data-testid="scroll">
        <table className={tableClassName}>
          <thead className="sticky-top bg-white">
            <tr>
              <th className="p-3 border-0">Level</th>
              <th className="px-1 py-3 border-0 text-center" colSpan={2}>Players</th>
              <th className="px-1 py-3 border-0">Date</th>
              <th className="px-1 py-3 border-0">Actions</th>
            </tr>
          </thead>
          <tbody>
            {games.map(game => {
              const { player1, player2 } = getGamePlayersData(game);

              return (
                <tr key={game.id}>
                  <td className="p-3 align-middle text-nowrap">
                    <GameLevelBadge level={game.level} />
                  </td>
                  <td className="px-1 py-3 align-middle text-nowrap cb-username-td text-truncate">
                    <div className="d-flex align-items-center">
                      <ResultIcon icon={player1.icon} />
                      <UserInfo className={cn({ 'pl-4': !player1.icon })} user={player1.data} truncate="true" />
                    </div>
                  </td>
                  <td className="px-1 py-3 align-middle text-nowrap cb-username-td text-truncate">
                    <div className="d-flex align-items-center">
                      <ResultIcon icon={player2.icon} />
                      <UserInfo className={cn({ 'pl-4': !player2.icon })} user={player2.data} truncate="true" />
                    </div>
                  </td>
                  <td className="px-1 py-3 align-middle text-nowrap">
                    {moment.utc(game.finishesAt).local().format('MM.DD HH:mm')}
                  </td>
                  <td className="px-1 py-3 align-middle">
                    <a type="button" className="btn btn-secondary btn-sm rounded-lg" href={`/games/${game.id}`}>
                      Show
                    </a>
                  </td>
                </tr>
            );
          })}
          </tbody>
        </table>
      </div>
      <HorizontalScrollControls className="d-md-none my-2" onScroll={onCardsScroll}>
        {games.map(game => (
          <GameCard key={`card-${game.id}`} type="completed" game={game} />
        ))}
      </HorizontalScrollControls>
    </>
  );
});

function CompletedGames({ className, tableClassName = '' }) {
  const dispatch = useDispatch();
  const { completedGames, totalGames, status } = useSelector(completedGamesSelector);

  useEffect(() => {
    dispatch(fetchCompletedGames());
  }, [dispatch]);

  if (completedGames.length === 0) {
    return status === fetchionStatuses.loading
      ? <Loading />
      : <div className="py-5 text-center text-muted">No completed games</div>;
  }

  return (
    <>
      <InfiniteScrollableGames
        className={cn(commonClassName, className)}
        tableClassName={cn(commonTableClassName, tableClassName)}
        games={completedGames}
      />
      <div className="mt-auto border-top py-2 px-5 font-weight-bold bg-white">
        {`Total games: ${totalGames}`}
      </div>
    </>
  );
}

export default CompletedGames;
