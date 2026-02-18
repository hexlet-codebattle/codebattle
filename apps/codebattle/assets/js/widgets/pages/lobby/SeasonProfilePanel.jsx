import React, { useState, useEffect } from "react";

import cn from "classnames";
import { useDispatch, useSelector } from "react-redux";

import { loadNearbyUsers } from "@/middlewares/Users";
import { selectDefaultAvatarUrl, currentUserIsAdminSelector, userByIdSelector } from "@/selectors";

import i18n from "../../../i18n";
import UserInfo from "../../components/UserInfo";
import { actions } from "../../slices";

import CodebattleLeagueDescription from "./CodebattleLeagueDescription";
import TournamentListItem from "./TournamentListItem";

const contestDatesText = "Season: Oct 16 - Dec 21";

function OpponentInfo({ id }) {
  const user = useSelector(userByIdSelector(id));

  return (
    <div className="d-flex align-items-center py-2 px-2 my-1 mx-1 stat-line cb-nearby-row">
      <div
        className="d-flex align-items-center flex-grow-1 pr-2 cb-nearby-user"
        style={{ minWidth: 0 }}
      >
        <UserLogo user={user} size="25px" />
        <div className="ml-2 cb-nearby-user-name">
          {user ? (
            <UserInfo
              user={user}
              className="text-white text-truncate"
              linkClassName="text-white"
              truncate
              hideOnlineIndicator
              hideRank
            />
          ) : (
            <span className="cb-text-skeleton w-100 d-block">&nbsp;</span>
          )}
        </div>
      </div>
      <div className="d-flex flex-column text-center py-1 px-1 flex-shrink-0 cb-nearby-metric">
        <a href="/hall_of_fame" className="stat-item py-1 w-100">
          <span
            className={cn("stat-value d-block cb-text-danger", {
              "d-inline cb-text-skeleton w-25 mx-auto": !user,
            })}
          >
            #{user ? user.rank : ""}
          </span>
          <span className="stat-label text-uppercase">Place</span>
        </a>
      </div>
      <div className="d-flex flex-column text-center py-1 px-1 flex-shrink-0 cb-nearby-metric">
        <div className="stat-item py-1 w-100">
          <span
            className={cn("stat-value d-block cb-text-danger", {
              "d-inline cb-text-skeleton w-25 mx-auto": !user,
            })}
          >
            {user ? user.points : ""}
          </span>
          <span className="stat-label text-uppercase">Points</span>
        </div>
      </div>
    </div>
  );
}

function SeasonNearbyUsers({ user, nearbyUsers }) {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(!!user.points);

  useEffect(() => {
    if (user.points) {
      const abortController = new AbortController();

      const onSuccess = (payload) => {
        if (!abortController.signal.aborted) {
          dispatch(actions.setNearbyUsers(payload.data));
          dispatch(actions.updateUsers(payload.data));
          setLoading(false);
        }
      };
      const onError = () => {
        setLoading(false);
      };

      setLoading(true);
      loadNearbyUsers(abortController, onSuccess, onError);

      return abortController.abort;
    }

    return () => {};
  }, [dispatch, setLoading, user?.points]);

  if (!user.points || (!loading && nearbyUsers.length === 0)) {
    return <></>;
  }

  return (
    <div className="cb-bg-panel cb-rounded mt-2 cb-nearby-card">
      <div className="d-flex flex-column">
        <div className="cb-bg-highlight-panel text-center cb-rounded-top px-2">
          <span className="text-white text-uppercase py-2 d-block">Closest Opponents</span>
        </div>
        <div className="px-1 pb-1">
          {loading ? (
            <>
              <OpponentInfo />
              <OpponentInfo />
            </>
          ) : (
            nearbyUsers.map((id) => <OpponentInfo key={id} id={id} />)
          )}
        </div>
      </div>
    </div>
  );
}

function UserLogo({ user, size = "70px" }) {
  const defaultAvatarUrl = useSelector(selectDefaultAvatarUrl);
  const avatarUrl = user?.avatarUrl || defaultAvatarUrl;

  return (
    <img
      style={{ width: size, height: size }}
      alt="Avatar Logo"
      className="rounded-circle"
      src={avatarUrl}
    />
  );
}

function SeasonProfilePanel({
  seasonTournaments = [],
  liveTournaments = [],
  nearbyUsers,
  user,
  controls,
}) {
  const isAdmin = useSelector(currentUserIsAdminSelector);

  return (
    <div className="d-flex flex-column-reverse flex-lg-row my-0 my-lg-2 cb-season-layout">
      <div className="col-12 col-lg-8 p-0 pr-lg-2 my-2 my-lg-0">
        <div className="cb-bg-panel cb-rounded d-flex flex-column p-3 h-100 w-100 text-center cb-season-main-card">
          <CodebattleLeagueDescription />
          {seasonTournaments?.length || liveTournaments?.length ? (
            <div>
              {liveTournaments?.length !== 0 && (
                <>
                  <div className="d-flex justify-content-center align-items-center pt-2 cb-season-section-title">
                    <span className="text-white text-uppercase h4">Live Tournaments</span>
                  </div>
                  <div className="d-flex flex-wrap cb-tournament-grid">
                    {liveTournaments.map((tournament) => (
                      <TournamentListItem
                        isAdmin={isAdmin}
                        key={tournament.id}
                        tournament={tournament}
                      />
                    ))}
                  </div>
                </>
              )}
              {seasonTournaments?.length !== 0 && (
                <>
                  <div className="d-flex justify-content-center pt-2 cb-season-section-title">
                    <span className="text-white text-uppercase h4">Upcoming Tournaments</span>
                  </div>
                  <div className="d-flex flex-wrap cb-tournament-grid">
                    {seasonTournaments.map((tournament) => (
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
          <div className="d-flex flex-column flex-lg-row w-100 pt-2 mt-2 cb-season-actions">
            <a
              href="/schedule#contest"
              type="button"
              className="btn btn-secondary cb-btn-secondary mx-0 mx-md-2 mx-lg-2 w-100 cb-rounded text-nowrap"
            >
              {i18n.t("Contests History")}
            </a>
            <a
              href="/schedule#my"
              type="button"
              className="btn btn-secondary cb-btn-secondary mx-0 mx-md-2 mx-lg-2 w-100 cb-rounded text-nowrap"
            >
              {i18n.t("My Tournaments")}
            </a>
            <a
              href="/tournaments"
              type="button"
              className="btn btn-secondary cb-btn-secondary mx-0 mx-md-2 mx-lg-2 w-100 cb-rounded text-nowrap"
            >
              {i18n.t("Create a Tournament")}
            </a>
          </div>
        </div>
      </div>
      <div className="col-12 col-lg-4 p-0 pl-lg-2 d-flex flex-column my-2 my-lg-0">
        <div className="cb-bg-panel cb-rounded cb-season-profile-card">
          <div className="text-center py-2">
            <UserLogo user={user} />
            <span className="clan-tag mt-2">{user.name}</span>
            <span className="h1 clan-title m-0 text-white text-uppercase">
              Clan
              {": "}
              {user.clanId ? (
                user.clan
              ) : (
                <a href="/settings" className="text-lowercase text-primary">
                  <small>add clan</small>
                </a>
              )}
            </span>
          </div>

          <div className="cb-bg-highlight-panel d-flex py-2 px-1 cb-season-stats">
            <div className="stat-item py-1 w-100">
              <span className="stat-value d-block cb-text-danger">{user.rating}</span>
              <span className="stat-label text-uppercase">(Elo Rating)</span>
            </div>
            <a href="/hall_of_fame" className="stat-item py-1 w-100">
              {user.points ? (
                <span className="stat-value d-block cb-text-success">#{user.rank}</span>
              ) : (
                <span className="stat-value d-block cb-text-danger">#0</span>
              )}
              <span className="stat-label text-uppercase">Place</span>
            </a>
            <div className="stat-item py-1 w-100">
              <span className="stat-value d-block cb-text-danger">{user.points || 0}</span>
              <span className="stat-label text-uppercase">Points</span>
            </div>
          </div>

          <div className="d-flex justify-content-center cb-font-size-small px-3 py-2 text-white">
            <span className="d-block">{contestDatesText}</span>
          </div>
        </div>
        <SeasonNearbyUsers user={user} nearbyUsers={nearbyUsers} />
        <div className="text-center mt-2 cb-hof-link">
          <a href="/hall_of_fame" className="text-uppercase stat-label cb-rounded">
            {i18n.t("View Hall of Fame")}
          </a>
        </div>
        {controls}
      </div>
    </div>
  );
}

export default SeasonProfilePanel;
