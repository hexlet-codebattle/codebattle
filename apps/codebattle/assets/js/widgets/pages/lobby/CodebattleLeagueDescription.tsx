import React, { useState } from 'react';

import { Accordion, Box, Button, Collapse, Grid, Text, Title } from '@mantine/core';

import i18n from '../../../i18n';

// Dark-theme friendly. Uses custom dark styles like cb-bg-panel,
// cb-bg-highlight-panel, cb-rounded, cb-btn-secondary, etc.

function CodebattleLeagueDescription() {
  const [opened, setOpened] = useState(false);

  return (
    <Box component="section" w="100%" my="sm" className="cb-league-description">
      <Box px={{ base: 'sm', md: 'md' }} py="md" ta="center">
        <Title order={2} c="white" m={0}>
          {i18n.t('Codebattle League')}
        </Title>
        <Text c="white" mt="sm" mb="md">
          {i18n.t(
            'Challenge the best! Participate in the Competition tournaments, defeat your rivals to earn points, and claim the first place in the programmer ranking.',
          )}
        </Text>

        <Button
          color="cbSecondary"
          onClick={() => setOpened((value) => !value)}
          aria-expanded={opened}
          aria-controls="leagueProtocol"
        >
          {i18n.t('See Rules & Details')}
        </Button>

        <Collapse expanded={opened}>
          <Box id="leagueProtocol" mt="md" ta="left">
            <Box p="sm" className="cb-bg-highlight-panel cb-rounded">
              <Accordion variant="separated" defaultValue="overview">
                <Accordion.Item value="overview" className="cb-bg-panel cb-rounded">
                  <Accordion.Control>
                    <Text component="span" tt="uppercase">
                      {i18n.t('Seasons, Grades, Points — Overview')}
                    </Text>
                  </Accordion.Control>
                  <Accordion.Panel c="white">
                    <Text mb="sm">
                      <strong>{i18n.t('Seasons')}</strong>
                    </Text>
                    <Box component="ul" mb="md">
                      <li>{i18n.t('Season 0: Sep 21 – Dec 21')}</li>
                      <li>{i18n.t('Season 1: Dec 21 – Mar 21')}</li>
                      <li>{i18n.t('Season 2: Mar 21 – Jun 21')}</li>
                      <li>{i18n.t('Season 3: Jun 21 – Sep 21')}</li>
                    </Box>
                    <Box component="ul" mb="md">
                      <li>
                        {i18n.t(
                          'On the season end date (the 21st), we run a Grand Slam at 16:00 UTC.',
                        )}
                      </li>
                      <li>
                        {i18n.t('Season Points reset each season. Elo never resets (lifetime).')}
                      </li>
                    </Box>
                    <Text mb="sm">
                      <strong>{i18n.t('Grades')}</strong>
                    </Text>
                    <Text mb={0}>
                      {i18n.t(
                        'open, rookie, challenger, pro, elite, masters, grand_slam — determine prestige, task pools, points, schedules, and limits.',
                      )}
                    </Text>
                  </Accordion.Panel>
                </Accordion.Item>

                <Accordion.Item value="schedule" className="cb-bg-panel cb-rounded">
                  <Accordion.Control>
                    <Text component="span" tt="uppercase">
                      {i18n.t('Tournament Scheduling & Preemption')}
                    </Text>
                  </Accordion.Control>
                  <Accordion.Panel c="white">
                    <Text mb="sm">
                      <strong>{i18n.t('Daily/Hourly (UTC)')}</strong>
                    </Text>
                    <Box component="ul" mb="md">
                      <li>
                        {i18n.t(
                          'Rookie: every 4 hours — 03:00, 07:00, 11:00, 15:00, 19:00, 23:00 UTC (no 16:00 slot).',
                        )}
                      </li>
                      <li>
                        {i18n.t(
                          'Challenger: daily 16:00 UTC; preempted by higher grades that day/week.',
                        )}
                      </li>
                    </Box>
                    <Text mb="sm">
                      <strong>{i18n.t('Weekly 16:00 UTC priority')}</strong>
                    </Text>
                    <Text mb="xs">{i18n.t('grand_slam > masters > elite > pro.')}</Text>
                    <Text mb={0}>
                      {i18n.t(
                        'In any week, exactly one of these runs at 16:00. Grand Slam week -> only GS at 16:00. Masters week -> no pro/elite. Otherwise pro (Tue) and elite (Wed) alternate as backbone.',
                      )}
                    </Text>
                  </Accordion.Panel>
                </Accordion.Item>

                <Accordion.Item value="limits" className="cb-bg-panel cb-rounded">
                  <Accordion.Control>
                    <Text component="span" tt="uppercase">
                      {i18n.t('Player Limits & Rounds per Grade')}
                    </Text>
                  </Accordion.Control>
                  <Accordion.Panel c="white">
                    <Grid>
                      <Grid.Col span={{ base: 12, md: 6 }}>
                        <Text mb="sm">
                          <strong>{i18n.t('Players limit')}</strong>
                        </Text>
                        <Box component="ul" mb="md">
                          <li>{i18n.t('rookie: 8')}</li>
                          <li>{i18n.t('challenger: 16')}</li>
                          <li>{i18n.t('pro: 32')}</li>
                          <li>{i18n.t('elite: 64')}</li>
                          <li>{i18n.t('masters: 128')}</li>
                          <li>{i18n.t('grand_slam: 256')}</li>
                        </Box>
                      </Grid.Col>
                      <Grid.Col span={{ base: 12, md: 6 }}>
                        <Text mb="sm">
                          <strong>{i18n.t('Rounds per grade')}</strong>
                        </Text>
                        <Box component="ul" mb={0}>
                          <li>{i18n.t('rookie: 4')}</li>
                          <li>{i18n.t('challenger: 6')}</li>
                          <li>{i18n.t('pro: 8')}</li>
                          <li>{i18n.t('elite: 10')}</li>
                          <li>{i18n.t('masters: 12')}</li>
                          <li>{i18n.t('grand_slam: 14')}</li>
                        </Box>
                      </Grid.Col>
                    </Grid>
                  </Accordion.Panel>
                </Accordion.Item>

                <Accordion.Item value="points" className="cb-bg-panel cb-rounded">
                  <Accordion.Control>
                    <Text component="span" tt="uppercase">
                      {i18n.t('Season Points Distribution')}
                    </Text>
                  </Accordion.Control>
                  <Accordion.Panel c="white">
                    <Text>
                      {i18n.t(
                        'For each finished tournament (grade != open), award Season Points by final place using the tables below. All remaining participants (outside prize slots) receive 2 points each. Prize points do not stack with participation points.',
                      )}
                    </Text>
                    <Grid>
                      <Grid.Col span={{ base: 12, md: 6 }}>
                        <Box component="ul" mb="md">
                          <li>{i18n.t('rookie: [8, 4, 2] - top-3')}</li>
                          <li>{i18n.t('challenger: [16, 8, 4, 2] - top-6')}</li>
                          <li>{i18n.t('pro: [128, 64, 32, 16, 8, 4, 2] - top-7')}</li>
                        </Box>
                      </Grid.Col>
                      <Grid.Col span={{ base: 12, md: 6 }}>
                        <Box component="ul" mb={0}>
                          <li>{i18n.t('elite: [256, 128, 64, 32, 16, 8, 4, 2] - top-8')}</li>
                          <li>
                            {i18n.t('masters: [1024, 512, 256, 128, 64, 32, 16, 8, 4, 2] - top-10')}
                          </li>
                          <li>
                            {i18n.t(
                              'grand_slam: [2048, 1024, 512, 256, 128, 64, 32, 16, 8, 4, 2] - top-11',
                            )}
                          </li>
                        </Box>
                      </Grid.Col>
                    </Grid>
                  </Accordion.Panel>
                </Accordion.Item>

                <Accordion.Item value="tie" className="cb-bg-panel cb-rounded">
                  <Accordion.Control>
                    <Text component="span" tt="uppercase">
                      {i18n.t('Season Leaderboard Tie-Breakers')}
                    </Text>
                  </Accordion.Control>
                  <Accordion.Panel c="white">
                    <Box component="ol" mb={0}>
                      <li>{i18n.t('Total Season Points (desc)')}</li>
                      <li>{i18n.t('Tournament wins in season (desc)')}</li>
                      <li>{i18n.t('Tournament participations in season (desc)')}</li>
                    </Box>
                  </Accordion.Panel>
                </Accordion.Item>

                <Accordion.Item value="hof" className="cb-bg-panel cb-rounded">
                  <Accordion.Control>
                    <Text component="span" tt="uppercase">
                      {i18n.t('Hall of Fame')}
                    </Text>
                  </Accordion.Control>
                  <Accordion.Panel c="white">
                    {i18n.t(
                      'Maintain a HoF for Season Champions and Grand Slam Champions (participants page optional later).',
                    )}
                  </Accordion.Panel>
                </Accordion.Item>

                <Accordion.Item value="cbOverview" className="cb-bg-panel cb-rounded">
                  <Accordion.Control>
                    <Text component="span" tt="uppercase">
                      {i18n.t('Codebattle - Overview & Key Concepts')}
                    </Text>
                  </Accordion.Control>
                  <Accordion.Panel c="white">
                    <Text mb="sm">
                      <strong>{i18n.t('Competitive Programming Game')}</strong>
                    </Text>
                    <Text mb="md">
                      {i18n.t(
                        'Codebattle (codebattle.hexlet.io) is a real-time coding duel platform. Two players solve the same task in parallel; whoever solves it first wins the match.',
                      )}
                    </Text>
                    <Text mb="sm">
                      <strong>{i18n.t('Swiss Tournaments')}</strong>
                    </Text>
                    <Text mb="md">
                      {i18n.t(
                        'Multiple rounds; in each round, players are paired vs players with similar cumulative score; no repeat pairings (unless unavoidable on round 1 bootstrap or via bot fill-ins).',
                      )}
                    </Text>
                    <Text mb="sm">
                      <strong>{i18n.t('Languages')}</strong>
                    </Text>
                    <Text mb={0}>
                      {i18n.t(
                        '16 supported - clojure, cpp, csharp, dart, elixir, golang, java, js, kotlin, php, python, ruby, rust, swift, zig, ts.',
                      )}
                    </Text>
                  </Accordion.Panel>
                </Accordion.Item>
              </Accordion>
            </Box>
          </Box>
        </Collapse>
      </Box>
    </Box>
  );
}

export default CodebattleLeagueDescription;
