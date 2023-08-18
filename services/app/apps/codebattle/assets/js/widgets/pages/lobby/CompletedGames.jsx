import moment from 'moment';
import React, {
  memo,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import cn from 'classnames';

import GameCard from './GameCard';
import UserInfo from '../../components/UserInfo';
import GameLevelBadge from '../../components/GameLevelBadge';
import ResultIcon from '../../components/ResultIcon';

const CompletedGamesRows = memo(({ games }) => (
  <>
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
        <td className="px-1 py-3 align-middle text-nowrap">{moment.utc(game.finishesAt).local().format('MM.DD HH:mm')}</td>
        <td className="px-1 py-3 align-middle">
          <a type="button" className="btn btn-secondary btn-sm rounded-lg" href={`/games/${game.id}`}>
            Show
          </a>
        </td>
      </tr>
      ))}
  </>
));

const commonTableClassName = 'table table-sm table-striped border-gray border-0 mb-0';
const commonClassName = 'd-none d-sm-none d-md-block';

function CompletedGames({
  games,
  loadNextPage = null,
  totalGames,
  className,
  tableClassName = '',
}) {
  const dispatch = useDispatch();

  const { nextPage, totalPages } = useSelector(state => state.completedGames);
  const object = useMemo(
    () => ({ loading: false }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nextPage],
  );

  /** @type {import("react").RefObject<HTMLDivElement>} */
  const cardListRef = useRef(null);
  const tableRef = useRef(null);

  useEffect(() => {
    const observerTableRef = tableRef;
    const observerCardsRef = cardListRef;

    const load = () => {
      if (object.loading) return;
      object.loading = true;

      if (nextPage <= totalPages) dispatch(loadNextPage(nextPage));
    };

    const onCardsScroll = () => {
      if (!cardListRef.current) return;
      const width = cardListRef.current.scrollWidth - cardListRef.current.parentElement?.offsetWidth;
      const delta = width - cardListRef.current.scrollLeft;

      if (delta < 50) { load(); }
    };

    const onTableScroll = () => {
      if (!tableRef.current) return;
      const height = tableRef.current.scrollHeight - tableRef.current.parentElement?.offsetHeight;
      const delta = height - tableRef.current.scrollTop;

      if (delta < 500) { load(); }
    };

    observerTableRef.current?.addEventListener('scroll', onTableScroll);
    observerCardsRef.current?.addEventListener('scroll', onCardsScroll);

    return () => {
      if (observerTableRef) {
        observerTableRef.current?.removeEventListener('scroll', onTableScroll);
      }

      if (observerCardsRef) {
        observerCardsRef.current?.removeEventListener('scroll', onCardsScroll);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [object]);

  return (
    <>
      <div ref={cardListRef} className="d-none d-sm-block d-md-none d-flex m-2 overflow-auto">
        {games.map(game => (
          <GameCard
            type="completed"
            game={game}
          />
        ))}
      </div>
      <div
        ref={tableRef}
        className={cn(commonClassName, className)}
        data-testid="scroll"
      >
        <table
          className={cn(commonTableClassName, tableClassName)}
        >
          <thead>
            <tr>
              <th className="p-3 border-0">Level</th>
              <th className="px-1 py-3 border-0 text-center" colSpan={2}>
                Players
              </th>
              <th className="px-1 py-3 border-0">Date</th>
              <th className="px-1 py-3 border-0">Actions</th>
            </tr>
          </thead>
          <tbody>
            <CompletedGamesRows {...{ games }} />
          </tbody>
        </table>
      </div>
      <div className="bg-white py-2 px-5 font-weight-bold border-gray border rounded-bottom">
        {`Total games: ${totalGames}`}
      </div>
    </>
  );
}

export default CompletedGames;
