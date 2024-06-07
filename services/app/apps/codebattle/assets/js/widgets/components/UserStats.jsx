import React, { useCallback } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import { useDispatch, useSelector } from 'react-redux';

import i18next from '../../i18n';
import { followUser, unfollowUser } from '../middlewares/Main';
import { redirectToNewGame } from '../slices';

import LanguageIcon from './LanguageIcon';
import Loading from './Loading';
import UserAchievements from './UserAchievements';

const UserStats = ({ data, user: userInfo }) => {
  const dispatch = useDispatch();

  const activeGameId = data?.activeGameId;
  const avatarUrl = userInfo.avatarUrl || data?.user?.avatarUrl || '/assets/images/logo.svg';
  const name = userInfo.name || data?.user?.name || 'Jon Doe';
  const lang = userInfo.lang || data?.user?.lang || 'js';

  const followId = useSelector(state => state.gameUI.followId);

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
        <div className="col d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center">
            <img
              className="img-fluid rounded-lg"
              style={{ maxHeight: '40px', width: '40px' }}
              src={avatarUrl}
              alt="User avatar"
            />
            <div className="d-flex flex-column ml-2">
              <div className="d-flex justify-content-between">
                <div className="d-flex align-items-center">
                  <span>{name}</span>
                  <LanguageIcon className="ml-1" lang={lang} />
                </div>
                <div>
                  <button
                    type="button"
                    title="play active game"
                    className={cn(
                      'btn btn-sm text-primary border-0 rounded-lg',
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
                      'btn btn-sm border-0 rounded-lg',
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
              <div className="d-flex justify-content-between align-items-baseline">
                <div className="d-flex align-items-baseline">
                  <img src="/assets/images/cup.svg" alt="rating" />
                  <span className="ml-1">
                    {data?.user?.rank || userInfo.rank || '####'}
                  </span>
                </div>
                <div className="d-flex align-items-baseline ml-2">
                  <img src="/assets/images/rating.svg" alt="rating" />
                  <span className="ml-1">
                    {data?.user?.rating || userInfo.rating || '####'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="row">
        <div className="col d-flex justify-content-between">
          <div>
            <span>{i18next.t('Won:')}</span>
            <b className="text-success">{data ? data.stats.games.won : '#'}</b>
          </div>
          <div className="ml-1">
            <span>{i18next.t('Lost:')}</span>
            <b className="text-danger">{data ? data.stats.games.lost : '#'}</b>
          </div>
          <div className="ml-1">
            <span>{i18next.t('GaveUp:')}</span>
            <b className="text-warning">
              {data ? data.stats.games.gaveUp : '#'}
            </b>
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
};

export default UserStats;
