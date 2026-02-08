import React, { useCallback } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import { useDispatch, useSelector } from 'react-redux';

import { selectDefaultAvatarUrl } from '@/selectors';

import i18next from '../../i18n';
import { followUser, unfollowUser } from '../middlewares/Main';
import { redirectToNewGame } from '../slices';

import LanguageIcon from './LanguageIcon';
import Loading from './Loading';
import UserAchievements from './UserAchievements';

const defaultGameStats = { won: 0, lost: 0, gaveUp: 0 };

const defaultTournamentStats = {
  rookieWins: 0,
  challengerWins: 0,
  proWins: 0,
  eliteWins: 0,
  mastersWins: 0,
  grandSlamWins: 0,
};

const tournamentGrades = [
  { key: 'grandSlamWins', label: 'GS' },
  { key: 'mastersWins', label: 'Masters' },
  { key: 'eliteWins', label: 'Elite' },
  { key: 'proWins', label: 'Pro' },
  { key: 'challengerWins', label: 'Challenger' },
  { key: 'rookieWins', label: 'Rookie' },
];

function StatsRow({ items }) {
  return (
    <div
      className="text-muted small mt-1"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        columnGap: '8px',
      }}
    >
      {items.map(({ key, label, value }) => (
        <span key={key} className="text-nowrap">
          {label}
          {': '}
          <b className="text-white">{value}</b>
        </span>
      ))}
    </div>
  );
}

function UserStats({ data, user: userInfo }) {
  const dispatch = useDispatch();
  const defaultAvatarUrl = useSelector(selectDefaultAvatarUrl);

  const activeGameId = data?.activeGameId;
  const avatarUrl = userInfo.avatarUrl || data?.user?.avatarUrl || defaultAvatarUrl;
  const name = userInfo.name || data?.user?.name || 'Jon Doe';
  const lang = userInfo.lang || data?.user?.lang || 'js';
  const clan = userInfo.clan || data?.user?.clan || data?.user?.clanName || data?.user?.clanLongName;
  const points = data?.user?.points || userInfo.points;
  const rating = data?.user?.rating || userInfo.rating;
  const rank = data?.user?.rank || userInfo.rank;
  const gameStats = data?.metrics?.gameStats || defaultGameStats;
  const tournamentsStats = data?.metrics?.tournamentsStats || defaultTournamentStats;

  const followId = useSelector((state) => state.gameUI.followId);

  const handlePlayClick = useCallback(() => {
    if (activeGameId) {
      redirectToNewGame(activeGameId);
    }
  }, [activeGameId]);

  const toggleFollowClick = useCallback(() => {
    if (userInfo.id && followId === userInfo.id) {
      dispatch(unfollowUser(userInfo.id));
    } else {
      dispatch(followUser(userInfo.id));
    }
  }, [userInfo.id, followId, dispatch]);

  return (
    <div className="container-fluid p-2">
      <div className="row">
        <div className="col">
          <div className="d-flex flex-column w-100">
            <div className="d-flex align-items-start justify-content-between">
              <div className="d-flex align-items-center text-white">
                <img
                  className="img-fluid cb-rounded mr-2"
                  style={{ maxHeight: '42px', width: '42px' }}
                  src={avatarUrl}
                  alt="User avatar"
                />
                <div className="d-flex flex-column">
                  <div className="d-flex align-items-center">
                    <LanguageIcon className="mr-1" lang={lang} />
                    <span className="font-weight-bold">{name}</span>
                  </div>
                  {clan && <span className="text-muted small">{clan}</span>}
                </div>
              </div>
              <div>
                <button
                  type="button"
                  title="play active game"
                  className={cn(
                    'btn btn-sm text-primary border-0 cb-rounded',
                    {
                      'text-primary': !!activeGameId,
                      'text-muted': !activeGameId,
                    },
                  )}
                  onClick={handlePlayClick}
                  disabled={!activeGameId}
                >
                  <FontAwesomeIcon icon="play" />
                </button>
                <button
                  type="button"
                  title="follow user"
                  className={cn(
                    'btn btn-sm border-0 cb-rounded',
                    {
                      'text-primary': followId !== userInfo.id,
                      'text-danger': followId === userInfo.id,
                    },
                  )}
                  onClick={toggleFollowClick}
                >
                  <FontAwesomeIcon icon="binoculars" />
                </button>
              </div>
            </div>
            <StatsRow
              items={[
                { key: 'place', label: i18next.t('Place'), value: rank ?? '####' },
                { key: 'points', label: i18next.t('Points'), value: points ?? '####' },
                { key: 'rating', label: i18next.t('Rating'), value: rating ?? '####' },
              ]}
            />
            {data && (
              <>
                <StatsRow
                  items={tournamentGrades.slice(0, 3).map(({ key, label }) => ({
                    key,
                    label,
                    value: tournamentsStats[key] ?? 0,
                  }))}
                />
                <StatsRow
                  items={tournamentGrades.slice(3, 6).map(({ key, label }) => ({
                    key,
                    label,
                    value: tournamentsStats[key] ?? 0,
                  }))}
                />
                <StatsRow
                  items={[
                    { key: 'won', label: i18next.t('Won'), value: gameStats.won },
                    { key: 'lost', label: i18next.t('Lost'), value: gameStats.lost },
                    { key: 'gaveUp', label: i18next.t('GaveUp'), value: gameStats.gaveUp },
                  ]}
                />
              </>
            )}
          </div>
        </div>
      </div>
      {!data ? (
        <Loading small />
      ) : (
        <UserAchievements achievements={data.achievements} />
      )}
    </div>
  );
}

export default UserStats;
