import React from 'react';

import i18n from '../../../i18n';

import TournamentListItem, { activeIcon } from './TournamentListItem';

const contestDatesText = 'Season: Oct 14 - Dec 21';

const SeasonProfilePanel = ({
  upcomingTournaments = [], liveTournaments = [], user, controls,
}) => (
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
        {upcomingTournaments?.length || liveTournaments?.length
          ? (
            <div className="cb-bg-highlight-panel">
              {liveTournaments?.length !== 0 && (
                <>
                  <div className="d-flex justify-content-center align-items-center pt-2 cb-bg-panel">
                    <span className="text-white text-uppercase h4">Live Tournaments</span>
                  </div>
                  {liveTournaments.map(tournament => (
                    <TournamentListItem
                      key={tournament.id}
                      tournament={tournament}
                      icon={activeIcon}
                    />
                  ))}
                </>
              )}
              {upcomingTournaments?.length !== 0 && (
                <>
                  <div className="d-flex justify-content-center pt-2 cb-bg-panel">
                    <span className="text-white text-uppercase h4">Upcoming Tournaments</span>
                  </div>
                  <div className="d-flex flex-column cb-overflow-y-scroll position-relative" style={{ maxHeight: '280px' }}>
                    {upcomingTournaments.map(tournament => (
                      <TournamentListItem
                        key={tournament.id}
                        tournament={tournament}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )
          : <div className="pt-2 mt-2">Competition not started yet</div>}
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
          <img style={{ width: '32px', height: '32px' }} alt="Avatar Logo" src={user.avatarUrl || '/assets/images/logo.svg'} />
          <span className="clan-tag mt-2">F-445633</span>
          <span className="h1 clan-title m-0 text-white text-uppercase">
            Clan
            {': '}
            {user.clanId ? user.clan : <a href="/settings" className="text-lowercase text-primary"><small>add clan</small></a>}
          </span>
        </div>

        <div className="cb-bg-highlight-panel d-flex py-2 px-1">
          <div className="stat-item py-1 w-100">
            <span className="stat-value d-block cb-text-danger">{user.rating}</span>
            <span className="stat-label text-uppercase">(Elo Rating)</span>
          </div>
          <div className="stat-item py-1 w-100">
            {user.points ? (
              <span className="stat-value d-block cb-text-success">
                #
                {user.rank}
              </span>
            ) : (
              <span className="stat-value d-block cb-text-danger">
                #0
              </span>
            )}
            <span className="stat-label text-uppercase">Place</span>
          </div>
          <div className="stat-item py-1 w-100">
            <span className="stat-value d-block cb-text-danger">{user.points || 0}</span>
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

export default SeasonProfilePanel;
