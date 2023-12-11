import React, { memo, useEffect, useRef } from 'react';

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

import GameCard from './GameCard';

const commonTableClassName = 'table table-striped mb-0';
const commonClassName = 'table-responsive d-none d-md-block mvh-100 cb-overflow-y-scroll';

const InfiniteScrollableGames = memo(({ className, tableClassName, games }) => {
  const dispatch = useDispatch();
  const tableRef = useRef(null);
  const cardListRef = useRef(null);

  useEffect(() => {
    const observableTable = tableRef.current;
    const observableCards = cardListRef.current;

    const onTableScroll = () => {
      const height = tableRef.current.scrollHeight - tableRef.current.parentElement?.offsetHeight;
      const delta = height - tableRef.current.scrollTop;

      if (delta < 500) {
        dispatch(loadNextPage());
      }
    };

    const onCardsScroll = () => {
      const width = cardListRef.current.scrollWidth - cardListRef.current.parentElement?.offsetWidth;
      const delta = width - cardListRef.current.scrollLeft;

      if (delta < 50) {
        dispatch(loadNextPage());
      }
    };

    observableTable.addEventListener('scroll', onTableScroll);
    observableCards.addEventListener('scroll', onCardsScroll);

    return () => {
      observableTable.removeEventListener('scroll', onTableScroll);
      observableCards.removeEventListener('scroll', onCardsScroll);
    };
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
            {games.map(game => (
              <tr key={game.id}>
                <td className="p-3 align-middle text-nowrap">
                  <GameLevelBadge level={game.level} />
                </td>
                <td className="px-1 py-3 align-middle text-nowrap cb-username-td text-truncate">
                  <div className="d-flex align-items-center">
                    <ResultIcon gameId={game.id} player1={game.players[0]} player2={game.players[1]} />
                    <UserInfo user={game.players[0]} truncate="true" />
                  </div>
                </td>
                <td className="px-1 py-3 align-middle text-nowrap cb-username-td text-truncate">
                  <div className="d-flex align-items-center">
                    <ResultIcon gameId={game.id} player1={game.players[1]} player2={game.players[0]} />
                    <UserInfo user={game.players[1]} truncate="true" />
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
            ))}
          </tbody>
        </table>
      </div>
      <div ref={cardListRef} className="d-flex d-md-none my-2 overflow-auto position-relative">
        <HorizontalScrollControls>
          {games.map(game => (
            <GameCard key={`card-${game.id}`} type="completed" game={game} />
          ))}
        </HorizontalScrollControls>
      </div>
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
