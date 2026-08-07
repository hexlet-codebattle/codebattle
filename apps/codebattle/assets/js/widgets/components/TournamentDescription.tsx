import React from 'react';

import { Box, Center, Flex, Stack, Text } from '@mantine/core';

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
  tournament: {
    grade: Grade | string;
    description?: string;
  };
}

function TournamentDescription({ className, tournament }: TournamentDescriptionProps) {
  return (
    <Box className={className}>
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
            {/* Bootstrap card retained: `.card.cb-card` styling (transparent bg,
                header highlight-panel) is keyed on the card/card-header/card-body
                structure — convert alongside the card theming, with a browser pass. */}
            <div className="card cb-card mt-2">
              <div className="card-header text-center">
                {i18n.t('View League Ranking Points System')}
              </div>
              <div className="card-body">
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
              </div>
            </div>
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
