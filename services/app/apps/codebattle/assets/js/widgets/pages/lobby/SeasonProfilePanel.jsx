import React, { useState, useEffect } from 'react';

import axios from 'axios';
import { camelizeKeys } from 'humps';
import { useSelector } from 'react-redux';

import {
  selectDefaultAvatarUrl,
  currentUserIsAdminSelector,
} from '@/selectors';

import i18n from '../../../i18n';

import TournamentListItem, { activeIcon } from './TournamentListItem';

const contestDatesText = 'Season: Oct 16 - Dec 21';

const UserLogo = ({ user, size = '70px' }) => {
  const [userInfo, setUserInfo] = useState();
  const defaultAvatarUrl = useSelector(selectDefaultAvatarUrl);
  const avatarUrl = user.avatarUrl || userInfo?.avatarUrl || defaultAvatarUrl;

  useEffect(() => {
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

    return () => {
      controller.abort();
    };
  }, [setUserInfo, user.id]);

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
  user,
  controls,
}) => {
  const isAdmin = useSelector(currentUserIsAdminSelector);

  return (
    <div className="d-flex flex-column-reverse flex-lg-row flex-md-row my-0 my-lg-2 my-md-2">
      <div className="col-12 col-lg-8 col-md-8 my-2 my-lg-0 my-md-0">
        <div className="cb-bg-panel cb-rounded d-flex flex-column p-3 h-100 w-100 text-center">
          <h2 className="text-white">Codebattle Season Competition</h2>
          <p className="m-auto pb-3 px-4 text-white">
            Challenge the best! Participate in the Competition tournaments
            {', '}
            defeat your rivals to earn points
            {', '}
            and claim the first place in the programmer ranking.
          </p>
          {seasonTournaments?.length || liveTournaments?.length ? (
            <div className="cb-bg-highlight-panel">
              {liveTournaments?.length !== 0 && (
                <>
                  <div className="d-flex justify-content-center align-items-center pt-2 cb-bg-panel">
                    <span className="text-white text-uppercase h4">
                      Live Tournaments
                    </span>
                  </div>
                  {liveTournaments.map(tournament => (
                    <TournamentListItem
                      isAdmin={isAdmin}
                      key={tournament.id}
                      tournament={tournament}
                      icon={activeIcon}
                    />
                  ))}
                </>
              )}
              {seasonTournaments?.length !== 0 && (
                <>
                  <div className="d-flex justify-content-center pt-2 cb-bg-panel">
                    <span className="text-white text-uppercase h4">
                      Upcoming Tournaments
                    </span>
                  </div>
                  <div
                    className="d-flex flex-column cb-overflow-y-scroll position-relative"
                    style={{ maxHeight: '280px' }}
                  >
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
          <div className="text-center p-2 py-3">
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

          <div className="d-flex justify-content-center cb-font-size-small py-2 px-3 text-white">
            <span className="d-block">{contestDatesText}</span>
          </div>
        </div>
        {controls}
      </div>
    </div>
  );
};

export default SeasonProfilePanel;
