import React, { memo } from 'react';

import { Link } from '@inertiajs/react';
import { Box, Button, Flex, Grid, Paper, SimpleGrid, Text } from '@mantine/core';
import cn from 'classnames';

import i18n from '../../../i18n';
import dayjs from '../../../i18n/dayjs';

interface SeasonResult {
  place: number;
  user_name: string;
  clan_name?: string;
  total_points: number;
}

export interface Season {
  id: number | string;
  name: string;
  year: number | string;
  starts_at: string;
  ends_at: string;
  top3?: SeasonResult[];
}

export interface SeasonsPageProps {
  seasons: Season[];
}

const getMedalEmoji = (place: number) => {
  switch (place) {
    case 1:
      return '🥇';
    case 2:
      return '🥈';
    case 3:
      return '🥉';
    default:
      return null;
  }
};

const formatSeasonDates = (season: Season) =>
  `${dayjs(season.starts_at).format('MMM D, YYYY')} - ${dayjs(season.ends_at).format('MMM D, YYYY')}`;

interface PodiumPlaceProps {
  result: SeasonResult;
  size?: 'normal' | 'large';
}

function PodiumPlace({ result, size = 'normal' }: PodiumPlaceProps) {
  const isLarge = size === 'large';

  return (
    <Paper
      h="100%"
      radius="sm"
      shadow="sm"
      className={cn('cb-hof-podium-card cb-seasons-podium-card', {
        'cb-gold-place-bg': result.place === 1,
        'cb-silver-place-bg': result.place === 2,
        'cb-bronze-place-bg': result.place === 3,
        'cb-seasons-podium-card-large': isLarge,
      })}
    >
      <Flex
        direction="column"
        align="center"
        justify="center"
        ta="center"
        flex={1}
        px={{ base: 'xs', md: 'md' }}
        py={isLarge ? 'lg' : 'md'}
      >
        <Box mb="sm" className="cb-seasons-podium-medal">
          {getMedalEmoji(result.place)}
        </Box>
        <Text
          component="h6"
          c="white"
          mb="sm"
          fw={isLarge ? 700 : 500}
          className="cb-seasons-podium-name"
        >
          {result.user_name}
        </Text>
        {result.clan_name && (
          <Box mb="sm" className="cb-seasons-podium-clan-wrap">
            <Text size="xs" c="dimmed" className="cb-seasons-podium-clan">
              {result.clan_name}
            </Text>
          </Box>
        )}
        <Text fw={700} c={isLarge ? 'yellow' : 'white'} className="cb-seasons-podium-points">
          {result.total_points}
        </Text>
        <Text size="xs" c="dimmed">
          {i18n.t('points')}
        </Text>
      </Flex>
    </Paper>
  );
}

interface Top3PodiumProps {
  top3?: SeasonResult[];
}

function Top3Podium({ top3 }: Top3PodiumProps) {
  if (!top3 || top3.length === 0) {
    return (
      <Text c="dimmed" ta="center" py="xl">
        {i18n.t('No results yet')}
      </Text>
    );
  }

  const first = top3.find((r) => r.place === 1);
  const second = top3.find((r) => r.place === 2);
  const third = top3.find((r) => r.place === 3);

  return (
    <Flex mx={{ base: -4, md: -8 }} align="flex-end" className="cb-seasons-podium-row">
      <Box w="33.3334%" px={{ base: 4, md: 8 }}>
        {second && (
          <Box className="cb-seasons-podium-offset cb-seasons-podium-offset-second">
            <PodiumPlace result={second} />
          </Box>
        )}
      </Box>

      <Box w="33.3334%" px={{ base: 4, md: 8 }}>
        {first && <PodiumPlace result={first} size="large" />}
      </Box>

      <Box w="33.3334%" px={{ base: 4, md: 8 }}>
        {third && (
          <Box className="cb-seasons-podium-offset cb-seasons-podium-offset-third">
            <PodiumPlace result={third} />
          </Box>
        )}
      </Box>
    </Flex>
  );
}

interface SeasonCardProps {
  season: Season;
}

function SeasonCard({ season }: SeasonCardProps) {
  return (
    <Paper
      withBorder
      radius="md"
      shadow="sm"
      h="100%"
      bg="cbPanel" className="cb-seasons-card"
    >
      <Flex direction="column" h="100%" p={{ base: 'md', lg: 'lg' }}>
        <Flex
          direction={{ base: 'column', sm: 'row' }}
          justify="space-between"
          align={{ sm: 'flex-start' }}
          mb="md"
          className="cb-seasons-card-header"
        >
          <Box pr={{ sm: 'md' }}>
            <Text tt="uppercase" size="xs" c="dimmed" className="cb-seasons-card-kicker">
              {i18n.t('Season')}
            </Text>
            <Text component="h3" className="text-gold cb-seasons-card-title" mb="sm" fw={500}>
              {season.name} {season.year}
            </Text>
            <Text c="dimmed" className="cb-seasons-card-dates">
              {formatSeasonDates(season)}
            </Text>
          </Box>
          <Button
            component={Link}
            href={`/seasons/${season.id}`}
            variant="outline"
            size="compact-sm"
            mt={{ base: 'md', sm: 0 }}
            className="btn-outline-gold cb-seasons-action"
          >
            {i18n.t('View Results')}
          </Button>
        </Flex>

        <Box className="cb-seasons-card-body">
          <Top3Podium top3={season.top3} />
        </Box>
      </Flex>
    </Paper>
  );
}

function SeasonsPage({ seasons }: SeasonsPageProps) {
  return (
    <Box
      c="cbText"
      mih="100vh"
      py="xl"
      style={{ background: "var(--cb-bg-panel-background)" }}
    >
      <Box w="100%" maw={1140} mx="auto" px="md">
        <Paper
          radius="md"
          shadow="sm"
          px={{ base: 'md', lg: 'lg' }}
          py="lg"
          mb="md"
          className="cb-seasons-hero"
        >
          <Flex
            direction={{ base: 'column', md: 'row' }}
            justify="space-between"
            align={{ md: 'center' }}
          >
            <Box ta={{ base: 'center', md: 'left' }}>
              <Text tt="uppercase" size="xs" c="dimmed" className="cb-seasons-eyebrow">
                {i18n.t('Competition archive')}
              </Text>
              <Text component="h1" className="text-gold cb-seasons-title" mb="sm" fw={700}>
                {i18n.t('Seasons')}
              </Text>
              <Text c="dimmed" className="cb-seasons-subtitle">
                {i18n.t('Browse finished seasons and open the full leaderboard for each one.')}
              </Text>
            </Box>
            <Box mt={{ base: 'md', md: 0 }}>
              <Button
                component={Link}
                href="/hall_of_fame"
                variant="outline"
                className="btn-outline-gold cb-seasons-hero-action"
              >
                {i18n.t('Hall of Fame')}
              </Button>
            </Box>
          </Flex>
        </Paper>

        {seasons.length === 0 ? (
          <Paper radius="md" shadow="sm" bg="cbPanel" className="cb-seasons-empty">
            <Box ta="center" py="xl">
              <Text c="dimmed">{i18n.t('No seasons found')}</Text>
            </Box>
          </Paper>
        ) : (
          <Grid gap={30}>
            {seasons.map((season) => (
              <Grid.Col key={season.id} span={{ base: 12, lg: 6 }} mb="lg">
                <SeasonCard season={season} />
              </Grid.Col>
            ))}
          </Grid>
        )}
      </Box>
    </Box>
  );
}

export default memo(SeasonsPage);
