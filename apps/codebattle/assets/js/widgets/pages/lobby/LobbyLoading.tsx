import React from 'react';

import { Box, Flex, Skeleton, VisuallyHidden } from '@mantine/core';

import i18n from '../../../i18n';

function LobbyLoading() {
  return (
    <Box
      className="cb-lobby-loading"
      c="cbText"
      role="status"
      aria-live="polite"
      mx="auto"
      px="md"
      maw={960}
    >
      <VisuallyHidden>{i18n.t('Loading...')}</VisuallyHidden>
      <div aria-hidden="true">
        <div className="cb-lobby-loading-hero">
          <div className="cb-lobby-loading-emblem">
            <span>&lt;/&gt;</span>
          </div>
          <div className="cb-lobby-loading-copy">
            <span className="cb-lobby-loading-kicker">
              <span className="cb-lobby-loading-status-dot" />
              {i18n.t('Codebattle lobby')}
            </span>
            <h1>{i18n.t('Preparing your arena')}</h1>
            <p>{i18n.t('Syncing live games, rankings, and challengers...')}</p>
            <div className="cb-lobby-loading-progress">
              <span />
            </div>
          </div>
        </div>
        <Flex direction={{ base: 'column-reverse', lg: 'row' }} my={{ base: 0, lg: 'sm' }}>
          <Box
            w={{ base: '100%', lg: '66.6667%' }}
            p={0}
            pr={{ lg: 'sm' }}
            my={{ base: 'sm', lg: 0 }}
          >
            <Flex
              className="cb-lobby-loading-main"
              bg="cbPanel"
              style={{ borderRadius: 'var(--mantine-radius-md)' }}
              direction="column"
              p="md"
            >
              <Skeleton h="1.2rem" w="50%" mx="auto" mb="lg" />
              <Skeleton h="1.2rem" w="100%" mb="sm" />
              <Skeleton h="1.2rem" w="75%" mx="auto" mb="lg" />
              <Flex direction={{ base: 'column', md: 'row' }} mt="auto">
                <Skeleton h="1.2rem" flex={1} mx={{ md: 'sm' }} mb={{ base: 'sm', md: 0 }} />
                <Skeleton h="1.2rem" flex={1} mx={{ md: 'sm' }} mb={{ base: 'sm', md: 0 }} />
                <Skeleton h="1.2rem" flex={1} mx={{ md: 'sm' }} />
              </Flex>
            </Flex>
          </Box>
          <Box
            w={{ base: '100%', lg: '33.3333%' }}
            p={0}
            pl={{ lg: 'sm' }}
            my={{ base: 'sm', lg: 0 }}
          >
            <Flex
              className="cb-lobby-loading-profile"
              bg="cbPanel"
              style={{ borderRadius: 'var(--mantine-radius-md)' }}
              direction="column"
              align="center"
              p="md"
            >
              <Skeleton circle w={72} h={72} mb="md" />
              <Skeleton h="1.2rem" w="50%" mb="md" />
              <Flex bg="cbHighlight" w="100%" p="md">
                <Skeleton h="1.2rem" flex={1} mx="xs" />
                <Skeleton h="1.2rem" flex={1} mx="xs" />
                <Skeleton h="1.2rem" flex={1} mx="xs" />
              </Flex>
            </Flex>
          </Box>
        </Flex>
        <Flex direction={{ base: 'column', lg: 'row' }} p={0}>
          <Box w={{ base: '100%', lg: '66.6667%' }} p={0} pr={{ lg: 'sm' }}>
            <Box
              className="cb-lobby-loading-secondary"
              bg="cbPanel"
              style={{ borderRadius: 'var(--mantine-radius-md)' }}
              p="md"
            >
              <Skeleton h="1.2rem" display="block" w="25%" mb="lg" />
              <Skeleton h="1.2rem" display="block" w="100%" mb="md" />
              <Skeleton h="1.2rem" display="block" w="75%" mb="md" />
              <Skeleton h="1.2rem" display="block" w="50%" />
            </Box>
          </Box>
          <Box
            w={{ base: '100%', lg: '33.3333%' }}
            p={0}
            pl={{ lg: 'sm' }}
            mt={{ base: 'sm', lg: 0 }}
          >
            <Box
              className="cb-lobby-loading-secondary"
              bg="cbPanel"
              style={{ borderRadius: 'var(--mantine-radius-md)' }}
              p="md"
            >
              <Skeleton display="block" w="50%" mb="lg" />
              <Skeleton h="1.2rem" display="block" w="100%" mb="md" />
              <Skeleton h="1.2rem" display="block" w="75%" />
            </Box>
          </Box>
        </Flex>
      </div>
    </Box>
  );
}

export default LobbyLoading;
