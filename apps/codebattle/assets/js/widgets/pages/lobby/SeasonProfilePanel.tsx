import React, { useState, useEffect } from 'react';

import { Anchor, Box, Button, Flex, Text, Title } from '@mantine/core';
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
              color="#ffffff"
              truncate
              hideOnlineIndicator
              hideRank
            />
          ) : (
            <span className="cb-text-skeleton" style={{ display: 'block', width: '100%' }}>
              &nbsp;
            </span>
          )}
        </Box>
      </Flex>
      <Flex
        direction="column"
        ta="center"
        py="xs"
        px="xs"
        style={{ flexShrink: 0 }}
        className="cb-nearby-metric"
      >
        <Anchor href="/hall_of_fame" className="stat-item" py={4} w="100%">
          <Text
            component="span"
            className={cn('stat-value cb-text-danger', {
              'cb-text-skeleton': !user,
            })}
            display="block"
            style={!user ? { width: '25%', marginInline: 'auto' } : undefined}
          >
            #{user ? user.rank : ''}
          </Text>
          <Text component="span" className="stat-label" tt="uppercase">
            {i18n.t('Place')}
          </Text>
        </Anchor>
      </Flex>
      <Flex
        direction="column"
        ta="center"
        py="xs"
        px="xs"
        style={{ flexShrink: 0 }}
        className="cb-nearby-metric"
      >
        <Box className="stat-item" py={4} w="100%">
          <Text
            component="span"
            className={cn('stat-value cb-text-danger', {
              'cb-text-skeleton': !user,
            })}
            display="block"
            style={!user ? { width: '25%', marginInline: 'auto' } : undefined}
          >
            {user ? user.points : ''}
          </Text>
          <Text component="span" className="stat-label" tt="uppercase">
            {i18n.t('Points')}
          </Text>
        </Box>
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
    <Box
      mt="sm"
      className="cb-nearby-card"
      bg="cbPanel"
      style={{ borderRadius: 'var(--mantine-radius-md)' }}
    >
      <Flex direction="column">
        <Box
          ta="center"
          px="sm"
          bg="cbHighlight"
          style={{
            borderTopLeftRadius: 'var(--mantine-radius-md)',
            borderTopRightRadius: 'var(--mantine-radius-md)',
          }}
        >
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
          className="cb-season-main-card"
          bg="cbPanel"
          style={{ borderRadius: 'var(--mantine-radius-md)' }}
        >
          <CodebattleLeagueDescription />
          {seasonTournaments?.length || liveTournaments?.length ? (
            <div>
              {liveTournaments?.length !== 0 && (
                <>
                  <Flex justify="center" align="center" pt="sm" className="cb-season-section-title">
                    <Title order={4} c="white" tt="uppercase">
                      {i18n.t('Live Tournaments')}
                    </Title>
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
                    <Title order={4} c="white" tt="uppercase">
                      {i18n.t('Upcoming Tournaments')}
                    </Title>
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
              style={{ whiteSpace: 'nowrap' }}
            >
              {i18n.t('Contests History')}
            </Button>
            <Button
              component="a"
              href="/schedule#my"
              color="cbSecondary"
              fullWidth
              mx={{ base: 0, md: 'sm' }}
              style={{ whiteSpace: 'nowrap' }}
            >
              {i18n.t('My Tournaments')}
            </Button>
            <Button
              component="a"
              href="/tournaments"
              color="cbSecondary"
              fullWidth
              mx={{ base: 0, md: 'sm' }}
              style={{ whiteSpace: 'nowrap' }}
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
        <Box
          className="cb-season-profile-card"
          bg="cbPanel"
          style={{ borderRadius: 'var(--mantine-radius-md)' }}
        >
          <Box ta="center" py="sm">
            <UserLogo user={user} />
            <Text component="span" mt="sm" className="clan-tag">
              {user.name}
            </Text>
            <Title order={1} c="white" tt="uppercase" className="clan-title">
              {i18n.t('Clan')}
              {': '}
              {user.clanId ? (
                user.clan
              ) : (
                <Anchor href="/settings" tt="lowercase">
                  <Text component="span" size="xs">
                    {i18n.t('add clan')}
                  </Text>
                </Anchor>
              )}
            </Title>
          </Box>

          <Flex py="sm" px="xs" bg="cbHighlight" className="cb-season-stats">
            <Box className="stat-item" py={4} w="100%">
              <Text component="span" className="stat-value cb-text-danger" display="block">
                {user.rating}
              </Text>
              <Text component="span" className="stat-label" tt="uppercase">
                {i18n.t('(Elo Rating)')}
              </Text>
            </Box>
            <Anchor href="/hall_of_fame" className="stat-item" py={4} w="100%">
              <Text
                component="span"
                className={cn('stat-value cb-text-success', {
                  'cb-text-skeleton': !user.points,
                })}
                display="block"
              >
                {user.points ? `#${user.rank}` : '#0'}
              </Text>
              <Text component="span" className="stat-label" tt="uppercase">
                {i18n.t('Place')}
              </Text>
            </Anchor>
            <Box className="stat-item" py={4} w="100%">
              <Text component="span" className="stat-value cb-text-danger" display="block">
                {user.points || 0}
              </Text>
              <Text component="span" className="stat-label" tt="uppercase">
                {i18n.t('Points')}
              </Text>
            </Box>
          </Flex>

          {contestDatesText && (
            <Flex justify="center" px="md" py="sm" c="white" className="cb-font-size-small">
              <Text component="span" display="block">
                {contestDatesText}
              </Text>
            </Flex>
          )}
        </Box>
        <SeasonNearbyUsers user={user} nearbyUsers={nearbyUsers} />
        <Box ta="center" mt="sm" className="cb-hof-link">
          <Anchor
            href="/hall_of_fame"
            tt="uppercase"
            className="stat-label"
            style={{ borderRadius: 'var(--mantine-radius-md)' }}
          >
            {i18n.t('View Hall of Fame')}
          </Anchor>
        </Box>
        {controls}
      </Flex>
    </Flex>
  );
}

export default SeasonProfilePanel;
