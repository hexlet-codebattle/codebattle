import React, { useState, useEffect } from 'react';

import axios from 'axios';
import cn from 'classnames';
import { camelizeKeys } from 'humps';
import { useDispatch, useSelector } from 'react-redux';

import { loadUserOpponents } from '@/middlewares/Users';
import {
  selectDefaultAvatarUrl,
  currentUserIsAdminSelector,
  userByIdSelector,
} from '@/selectors';

import i18n from '../../../i18n';
import { actions } from '../../slices';

import CodebattleLeagueDescription from './CodebattleLeagueDescription';
import TournamentListItem, { activeIcon } from './TournamentListItem';

const contestDatesText = 'Season: Oct 16 - Dec 21';

const OpponentInfo = ({ id }) => {
  const user = useSelector(userByIdSelector(id));

  return (
    <div className="d-flex py-2 mx-1 stat-line">
      <div className="d-flex align-items-center w-100">
        <UserLogo user={user} size="25px" />
        <span
          title={user?.name}
          className={
            cn(
              'text-white text-truncate ml-2',
              { 'cb-text-skeleton w-100': !user },
            )
          }
          style={{ maxWidth: '70px' }}
        >
          {user?.name}
        </span>
      </div>
      <div className="d-flex flex-column text-center py-1 w-100">
        <span
          className={
            cn(
              'stat-value d-block cb-text-danger',
              { 'd-inline cb-text-skeleton w-25 mx-auto': !user },
            )
          }
        >
          {user ? user.rank : ''}
        </span>
        <span className="stat-label text-uppercase">Place</span>
      </div>
      <div className="d-flex flex-column text-center py-1 w-100">
        <span
          className={
            cn(
              'stat-value d-block cb-text-danger',
              { 'd-inline cb-text-skeleton w-25 mx-auto': !user },
            )
          }
        >
          {user ? user.points : ''}
        </span>
        <span className="stat-label text-uppercase">Points</span>
      </div>
    </div>
  );
};

const SeasonOpponents = ({ user, opponents }) => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(!!user.points);

  useEffect(() => {
    if (!user.points) {
      const abortController = new AbortController();

      const onSuccess = payload => {
        if (!abortController.signal.aborted) {
          dispatch(actions.setOpponents(payload.data));
          dispatch(actions.updateUsers(payload.data));
          setLoading(false);
        }
      };
      const onError = () => {
        setLoading(false);
      };

      setLoading(true);
      loadUserOpponents(abortController, onSuccess, onError);

      return abortController.abort;
    }

    return () => { };
  }, [dispatch, setLoading, user?.points]);

  if (!user.points || (!loading && opponents.length === 0)) {
    return <></>;
  }

  return (
    <div className="cb-bg-panel cb-rounded mt-2">
      <div className="d-flex flex-column">
        <div className="cb-bg-highlight-panel text-center cb-rounded-top">
          <span className="text-white text-uppercase p-1 pt-2">Closest opponents</span>
        </div>
        {loading ? (
          <>
            <OpponentInfo />
            <OpponentInfo />
          </>
        ) : opponents.map(id => <OpponentInfo id={id} />)}
      </div>
    </div>
  );
};

const UserLogo = ({ user, size = '70px' }) => {
  const [userInfo, setUserInfo] = useState();
  const defaultAvatarUrl = useSelector(selectDefaultAvatarUrl);
  const avatarUrl = user?.avatarUrl || userInfo?.avatarUrl || defaultAvatarUrl;

  useEffect(() => {
    if (user) {
      const userId = user.id;
      const controller = new AbortController();

      axios
        .get(`/api/v1/user/${userId}/stats`, {
          signal: controller.signal,
        })
        .then(response => {
          if (!controller.signal.aborted) {
            setUserInfo(camelizeKeys(response.data.user));
          }
        });

      return controller.abort;
    }

    return () => { };
    // eslint-disable-next-line
  }, [setUserInfo, user?.id]);

  return (
    <img
      style={{ width: size, height: size }}
      alt="Avatar Logo"
      className="rounded-circle"
      src={avatarUrl}
    />
  );
};

const SeasonProfilePanel = ({
  seasonTournaments = [],
  liveTournaments = [],
  opponents,
  user,
  controls,
}) => {
  const isAdmin = useSelector(currentUserIsAdminSelector);

  return (
    <div className="d-flex flex-column-reverse flex-lg-row flex-md-row my-0 my-lg-2 my-md-2">
      <div className="col-12 col-lg-8 col-md-8 my-2 my-lg-0 my-md-0">
        <div className="cb-bg-panel cb-rounded d-flex flex-column p-3 h-100 w-100 text-center">
          <CodebattleLeagueDescription />
          {seasonTournaments?.length || liveTournaments?.length ? (
            <div>
              {liveTournaments?.length !== 0 && (
                <>
                  <div className="d-flex justify-content-center align-items-center pt-2">
                    <span className="text-white text-uppercase h4">
                      Live Tournaments
                    </span>
                  </div>
                  <div className="d-flex flex-wrap">
                    {liveTournaments.map(tournament => (
                      <TournamentListItem
                        isAdmin={isAdmin}
                        key={tournament.id}
                        tournament={tournament}
                        icon={activeIcon}
                      />
                    ))}
                  </div>
                </>
              )}
              {seasonTournaments?.length !== 0 && (
                <>
                  <div className="d-flex justify-content-center pt-2">
                    <span className="text-white text-uppercase h4">
                      Upcoming Tournaments
                    </span>
                  </div>
                  <div className="d-flex flex-wrap">
                    {seasonTournaments.map(tournament => (
                      <TournamentListItem
                        isAdmin={isAdmin}
                        key={tournament.id}
                        tournament={tournament}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="pt-2 mt-2">Competition not started yet</div>
          )}
          <div className="d-flex flex-column flex-lg-row flex-md-row w-100 pt-2 mt-2">
            <a
              href="/schedule#contest"
              type="button"
              className="btn btn-secondary cb-btn-secondary mx-0 mx-md-2 mx-lg-2 w-100 cb-rounded text-nowrap"
            >
              {i18n.t('Contests History')}
            </a>
            <a
              href="/schedule#my"
              type="button"
              className="btn btn-secondary cb-btn-secondary mx-0 mx-md-2 mx-lg-2 w-100 cb-rounded text-nowrap"
            >
              {i18n.t('My Tournaments')}
            </a>
            <a
              href="/tournaments"
              type="button"
              className="btn btn-secondary cb-btn-secondary mx-0 mx-md-2 mx-lg-2 w-100 cb-rounded text-nowrap"
            >
              {i18n.t('Create a Tournament')}
            </a>
          </div>
        </div>
      </div>
      <div className="col-12 col-lg-4 col-md-4 d-flex flex-column my-2 my-lg-0 my-md-0">
        <div className="cb-bg-panel cb-rounded">
          <div className="text-center py-2">
            <UserLogo user={user} />
            <span className="clan-tag mt-2">{user.name}</span>
            <span className="h1 clan-title m-0 text-white text-uppercase">
              Clan
              {': '}
              {user.clanId ? (
                user.clan
              ) : (
                <a href="/settings" className="text-lowercase text-primary">
                  <small>add clan</small>
                </a>
              )}
            </span>
          </div>

          <div className="cb-bg-highlight-panel d-flex py-2 px-1">
            <div className="stat-item py-1 w-100">
              <span className="stat-value d-block cb-text-danger">
                {user.rating}
              </span>
              <span className="stat-label text-uppercase">(Elo Rating)</span>
            </div>
            <div className="stat-item py-1 w-100">
              {user.points ? (
                <span className="stat-value d-block cb-text-success">
                  #
                  {user.rank}
                </span>
              ) : (
                <span className="stat-value d-block cb-text-danger">#0</span>
              )}
              <span className="stat-label text-uppercase">Place</span>
            </div>
            <div className="stat-item py-1 w-100">
              <span className="stat-value d-block cb-text-danger">
                {user.points || 0}
              </span>
              <span className="stat-label text-uppercase">Points</span>
            </div>
          </div>

          <div className="d-flex justify-content-center cb-font-size-small px-3 py-2 text-white">
            <span className="d-block">{contestDatesText}</span>
          </div>
        </div>
        <SeasonOpponents user={user} opponents={opponents} />
        {controls}
      </div>
    </div>
  );
};

export default SeasonProfilePanel;
