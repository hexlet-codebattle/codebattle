import React, { useState, useEffect } from 'react';

import { Anchor, Box, Button, Flex, Text } from '@mantine/core';
import cn from 'classnames';
import { getPageProp } from '@/inertia/pageProps';
import { useDispatch, useSelector } from 'react-redux';

import { loadNearbyUsers } from '@/middlewares/Users';
import { selectDefaultAvatarUrl, currentUserIsAdminSelector, userByIdSelector } from '@/selectors';

import i18n from '../../../i18n';
import dayjs from '../../../i18n/dayjs';
import { type UserNameUser } from '../../components/UserName';
import UserInfo from '../../components/UserInfo';
import { actions, type AppDispatch } from '../../slices';

import CodebattleLeagueDescription from './CodebattleLeagueDescription';
import { type LobbyTournament } from './TournamentCard';
import TournamentListItem from './TournamentListItem';

interface CurrentSeason {
  name: string;
  year: string | number;
  starts_at: string;
  ends_at: string;
}

const currentSeason = getPageProp<CurrentSeason | null>('current_season', null);
const contestDatesText = currentSeason
  ? i18n.t('Season %{name} %{year}: %{start} - %{end}', {
      name: currentSeason.name,
      year: currentSeason.year,
      start: dayjs(currentSeason.starts_at).format('MMM D'),
      end: dayjs(currentSeason.ends_at).format('MMM D'),
    })
  : null;

interface SeasonUser {
  id?: number;
  name?: string;
  rank?: number;
  points?: number;
  rating?: number;
  clan?: string;
  clanId?: number;
  avatarUrl?: string;
  [key: string]: unknown;
}

interface OpponentInfoProps {
  id?: number;
}

function OpponentInfo({ id }: OpponentInfoProps) {
  const user = useSelector(userByIdSelector(id as number)) as SeasonUser | undefined;

  return (
    <Flex align="center" py="sm" px="sm" my="xs" mx="xs" className="stat-line cb-nearby-row">
      <Flex align="center" pr="sm" className="cb-nearby-user" style={{ minWidth: 0, flexGrow: 1 }}>
        <UserLogo user={user} size="25px" />
        <Box ml="sm" className="cb-nearby-user-name">
          {user ? (
            <UserInfo
              user={user as unknown as UserNameUser}
              className="text-white text-truncate"
              linkClassName="text-white"
              truncate
              hideOnlineIndicator
              hideRank
            />
          ) : (
            <span className="cb-text-skeleton w-100 d-block">&nbsp;</span>
          )}
        </Box>
      </Flex>
      <Flex
        direction="column"
        ta="center"
        py="xs"
        px="xs"
        className="flex-shrink-0 cb-nearby-metric"
      >
        <a href="/hall_of_fame" className="stat-item py-1 w-100">
          <span
            className={cn('stat-value d-block cb-text-danger', {
              'd-inline cb-text-skeleton w-25 mx-auto': !user,
            })}
          >
            #{user ? user.rank : ''}
          </span>
          <span className="stat-label text-uppercase">{i18n.t('Place')}</span>
        </a>
      </Flex>
      <Flex
        direction="column"
        ta="center"
        py="xs"
        px="xs"
        className="flex-shrink-0 cb-nearby-metric"
      >
        <div className="stat-item py-1 w-100">
          <span
            className={cn('stat-value d-block cb-text-danger', {
              'd-inline cb-text-skeleton w-25 mx-auto': !user,
            })}
          >
            {user ? user.points : ''}
          </span>
          <span className="stat-label text-uppercase">{i18n.t('Points')}</span>
        </div>
      </Flex>
    </Flex>
  );
}

interface SeasonNearbyUsersProps {
  user: SeasonUser;
  nearbyUsers: number[];
}

export function SeasonNearbyUsers({ user, nearbyUsers }: SeasonNearbyUsersProps) {
  const dispatch = useDispatch<AppDispatch>();
  const [loading, setLoading] = useState(!!user.points);

  useEffect(() => {
    if (user.points) {
      const abortController = new AbortController();

      const onSuccess = (payload: { users: Array<{ id: number }> }) => {
        if (!abortController.signal.aborted) {
          dispatch(actions.setNearbyUsers(payload));
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          dispatch(actions.updateUsers(payload as any));
          setLoading(false);
        }
      };
      const onError = () => {
        setLoading(false);
      };

      setLoading(true);
      loadNearbyUsers(abortController, onSuccess, onError);

      return () => abortController.abort();
    }

    return () => {};
  }, [dispatch, setLoading, user?.points]);

  if (!user.points || (!loading && nearbyUsers.length === 0)) {
    return <></>;
  }

  return (
    <Box mt="sm" className="cb-bg-panel cb-rounded cb-nearby-card">
      <Flex direction="column">
        <Box ta="center" px="sm" className="cb-bg-highlight-panel cb-rounded-top">
          <Text component="span" c="white" tt="uppercase" py="sm" display="block">
            {i18n.t('Closest Opponents')}
          </Text>
        </Box>
        <Box px="xs" pb="xs">
          {loading ? (
            <>
              <OpponentInfo />
              <OpponentInfo />
            </>
          ) : (
            nearbyUsers.map((id) => <OpponentInfo key={id} id={id} />)
          )}
        </Box>
      </Flex>
    </Box>
  );
}

interface UserLogoProps {
  user?: SeasonUser | null;
  size?: string;
}

function UserLogo({ user, size = '70px' }: UserLogoProps) {
  const defaultAvatarUrl = useSelector(selectDefaultAvatarUrl);
  const avatarUrl = user?.avatarUrl || defaultAvatarUrl;

  return (
    <img
      style={{ width: size, height: size, borderRadius: '50%' }}
      alt={i18n.t('Avatar Logo')}
      src={avatarUrl}
    />
  );
}

interface SeasonProfilePanelProps {
  seasonTournaments?: LobbyTournament[];
  liveTournaments?: LobbyTournament[];
  nearbyUsers: number[];
  user: SeasonUser;
  controls?: React.ReactNode;
}

function SeasonProfilePanel({
  seasonTournaments = [],
  liveTournaments = [],
  nearbyUsers,
  user,
  controls,
}: SeasonProfilePanelProps) {
  const isAdmin = useSelector(currentUserIsAdminSelector);

  return (
    <Flex
      direction={{ base: 'column-reverse', lg: 'row' }}
      my={{ base: 0, lg: 'sm' }}
      className="cb-season-layout"
    >
      <Box
        w={{ base: '100%', lg: '66.6667%' }}
        p={0}
        pr={{ base: 0, lg: 'sm' }}
        my={{ base: 'sm', lg: 0 }}
      >
        <Flex
          direction="column"
          p="md"
          h="100%"
          w="100%"
          ta="center"
          className="cb-bg-panel cb-rounded cb-season-main-card"
        >
          <CodebattleLeagueDescription />
          {seasonTournaments?.length || liveTournaments?.length ? (
            <div>
              {liveTournaments?.length !== 0 && (
                <>
                  <Flex justify="center" align="center" pt="sm" className="cb-season-section-title">
                    <Text component="span" c="white" tt="uppercase" className="h4">
                      {i18n.t('Live Tournaments')}
                    </Text>
                  </Flex>
                  <Flex wrap="wrap" className="cb-tournament-grid">
                    {liveTournaments.map((tournament) => (
                      <TournamentListItem
                        isAdmin={isAdmin}
                        key={tournament.id}
                        tournament={tournament}
                      />
                    ))}
                  </Flex>
                </>
              )}
              {seasonTournaments?.length !== 0 && (
                <>
                  <Flex justify="center" pt="sm" className="cb-season-section-title">
                    <Text component="span" c="white" tt="uppercase" className="h4">
                      {i18n.t('Upcoming Tournaments')}
                    </Text>
                  </Flex>
                  <Flex wrap="wrap" className="cb-tournament-grid">
                    {seasonTournaments.map((tournament) => (
                      <TournamentListItem
                        isAdmin={isAdmin}
                        key={tournament.id}
                        tournament={tournament}
                      />
                    ))}
                  </Flex>
                </>
              )}
            </div>
          ) : (
            <Box pt="sm" mt="sm">
              {i18n.t('Competition not started yet')}
            </Box>
          )}
          <Flex
            direction={{ base: 'column', lg: 'row' }}
            w="100%"
            pt="sm"
            mt="sm"
            className="cb-season-actions"
          >
            <Button
              component="a"
              href="/schedule#contest"
              color="cbSecondary"
              fullWidth
              mx={{ base: 0, md: 'sm' }}
              className="text-nowrap"
            >
              {i18n.t('Contests History')}
            </Button>
            <Button
              component="a"
              href="/schedule#my"
              color="cbSecondary"
              fullWidth
              mx={{ base: 0, md: 'sm' }}
              className="text-nowrap"
            >
              {i18n.t('My Tournaments')}
            </Button>
            <Button
              component="a"
              href="/tournaments"
              color="cbSecondary"
              fullWidth
              mx={{ base: 0, md: 'sm' }}
              className="text-nowrap"
            >
              {i18n.t('Create a Tournament')}
            </Button>
          </Flex>
        </Flex>
      </Box>
      <Flex
        direction="column"
        w={{ base: '100%', lg: '33.3333%' }}
        p={0}
        pl={{ base: 0, lg: 'sm' }}
        my={{ base: 'sm', lg: 0 }}
      >
        <Box className="cb-bg-panel cb-rounded cb-season-profile-card">
          <Box ta="center" py="sm">
            <UserLogo user={user} />
            <Text component="span" mt="sm" className="clan-tag">
              {user.name}
            </Text>
            <Text component="span" m={0} c="white" tt="uppercase" className="h1 clan-title">
              {i18n.t('Clan')}
              {': '}
              {user.clanId ? (
                user.clan
              ) : (
                <Anchor href="/settings" tt="lowercase">
                  <small>{i18n.t('add clan')}</small>
                </Anchor>
              )}
            </Text>
          </Box>

          <Flex py="sm" px="xs" className="cb-bg-highlight-panel cb-season-stats">
            <div className="stat-item py-1 w-100">
              <span className="stat-value d-block cb-text-danger">{user.rating}</span>
              <span className="stat-label text-uppercase">{i18n.t('(Elo Rating)')}</span>
            </div>
            <a href="/hall_of_fame" className="stat-item py-1 w-100">
              {user.points ? (
                <span className="stat-value d-block cb-text-success">#{user.rank}</span>
              ) : (
                <span className="stat-value d-block cb-text-danger">#0</span>
              )}
              <span className="stat-label text-uppercase">{i18n.t('Place')}</span>
            </a>
            <div className="stat-item py-1 w-100">
              <span className="stat-value d-block cb-text-danger">{user.points || 0}</span>
              <span className="stat-label text-uppercase">{i18n.t('Points')}</span>
            </div>
          </Flex>

          {contestDatesText && (
            <Flex justify="center" px="md" py="sm" c="white" className="cb-font-size-small">
              <span className="d-block">{contestDatesText}</span>
            </Flex>
          )}
        </Box>
        <SeasonNearbyUsers user={user} nearbyUsers={nearbyUsers} />
        <Box ta="center" mt="sm" className="cb-hof-link">
          <a href="/hall_of_fame" className="text-uppercase stat-label cb-rounded">
            {i18n.t('View Hall of Fame')}
          </a>
        </Box>
        {controls}
      </Flex>
    </Flex>
  );
}

export default SeasonProfilePanel;
