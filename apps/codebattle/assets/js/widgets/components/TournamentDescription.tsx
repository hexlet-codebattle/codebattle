import React from 'react';

import { Box, Center, Flex, Paper, Stack, Text } from '@mantine/core';

import {
  getGradeLabel,
  getRankingPoints,
  getTasksCount,
  grades,
  type Grade,
} from '@/config/grades';

import i18n from '../../i18n';

interface GradeInfoProps {
  grade: Grade | string;
  selected: Grade | string;
}

function GradeInfo({ grade, selected }: GradeInfoProps) {
  const isSelected = grade === selected;

  return (
    <Flex
      direction={{ base: 'column', sm: 'row' }}
      justify="space-between"
      ff={isSelected ? 'monospace' : undefined}
    >
      <Text component="span" c={isSelected ? 'white' : undefined}>
        {i18n.t(getGradeLabel(grade))}
        {isSelected && '(*)'}
      </Text>
      <Text component="span" pl="md" c={isSelected ? 'white' : undefined}>
        [{getRankingPoints(grade).join(', ')}]
      </Text>
    </Flex>
  );
}

interface TournamentDescriptionProps {
  className?: string;
  style?: React.CSSProperties;
  tournament: {
    grade: Grade | string;
    description?: string;
  };
}

function TournamentDescription({ className, style, tournament }: TournamentDescriptionProps) {
  return (
    <Box className={className} style={style}>
      {tournament.grade !== grades.open ? (
        <>
          <Text component="span" c="white">
            {i18n.t('Tournament Highlights:')}
          </Text>
          <Stack gap={0}>
            <span>{i18n.t('Prizes: Codebattle T-shirt merch for a top-tier of League')}</span>
            <span>
              {i18n.t('Challenges: %{count} unique algorithm problems', {
                count: getTasksCount(tournament.grade),
              })}
            </span>
            <span>{i18n.t('Impact: Advancing in the Codebattle programmer rankings')}</span>
          </Stack>
          <Center w="100%">
            <Paper
              mt="sm"
              radius="md"
              withBorder
              className="cb-border-color"
              style={{ backgroundColor: 'transparent' }}
            >
              <Box className="cb-bg-highlight-panel cb-border-color" ta="center" p="xs">
                <Text component="span" c="white" style={{ fontFamily: 'Arial, sans-serif' }}>
                  {i18n.t('View League Ranking Points System')}
                </Text>
              </Box>
              <Box p="md">
                {[
                  grades.rookie,
                  grades.challenger,
                  grades.pro,
                  grades.elite,
                  grades.masters,
                  grades.grandSlam,
                ].map((grade) => (
                  <GradeInfo key={grade} grade={grade} selected={tournament.grade} />
                ))}
              </Box>
            </Paper>
          </Center>
        </>
      ) : (
        <>
          <Text component="span" c="white">
            {i18n.t('Tournament Description:')}
          </Text>
          {tournament.description}
        </>
      )}
    </Box>
  );
}

export default TournamentDescription;
