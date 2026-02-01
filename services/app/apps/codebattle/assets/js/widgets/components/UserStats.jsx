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
        <div className="col d-flex align-items-center">
          <img
            className="img-fluid cb-rounded"
            style={{ maxHeight: '56px', width: '56px' }}
            src={avatarUrl}
            alt="User avatar"
          />
          <div className="d-flex flex-column ml-2 w-100">
            <div className="d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center text-white">
                <LanguageIcon className="mr-1" lang={lang} />
                <span className="font-weight-bold">{name}</span>
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
            <div className="d-flex flex-wrap align-items-baseline text-muted small mt-1">
              {clan && <span className="mr-2 text-white">{clan}</span>}
              <span className="mr-2">
                {i18next.t('Place')}
                {': '}
                <b className="text-white">{rank ?? '####'}</b>
              </span>
              <span className="mr-2">
                {i18next.t('Points')}
                {': '}
                <b className="text-white">{points ?? '####'}</b>
              </span>
              <span>
                {i18next.t('Rating')}
                {': '}
                <b className="text-white">{rating ?? '####'}</b>
              </span>
            </div>
            <div className="d-flex justify-content-between mt-1">
              <div>
                <span>{i18next.t('Won:')}</span>
                <b className="text-success">{data ? data.stats.games.won : '#'}</b>
              </div>
              <div className="ml-2">
                <span>{i18next.t('Lost:')}</span>
                <b className="text-danger">{data ? data.stats.games.lost : '#'}</b>
              </div>
              <div className="ml-2">
                <span>{i18next.t('GaveUp:')}</span>
                <b className="text-warning">
                  {data ? data.stats.games.gaveUp : '#'}
                </b>
              </div>
            </div>
          </div>
        </div>
      </div>
      {!data ? (
        <Loading small />
      ) : (
        <UserAchievements achievements={data.user.achievements} />
      )}
    </div>
  );
}

export default UserStats;
