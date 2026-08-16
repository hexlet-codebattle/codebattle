import React, { memo, useCallback } from 'react';

import { Box, Button, Flex, Text } from '@mantine/core';
import cn from 'classnames';
import { compress } from 'lz-string';
import { useDispatch } from 'react-redux';

import { type AppDispatch } from '@/slices';

import i18n from '../../../i18n';
import Loading from '@/components/Loading';
import * as roomActions from '@/middlewares/Room';
import useCssBattle from '@/utils/useCssBattle';
import useHover from '@/utils/useHover';

const frameStyle = {
  minWidth: 300,
  minHeight: 200,
};

const statusTitleMap = {
  targetIsEmpty: 'Create a new css task',
  targetIsInvalid: 'Error',
  process: 'Processing...',
  loading: 'Loading...',
};

function CssBattleInfoPanel() {
  const dispatch = useDispatch<AppDispatch>();

  const [ref, hovered] = useHover();

  const {
    matchStats,
    leftImgRef,
    rightImgRef,
    targetImgRef,
    leftSolutionIframe,
    rightSolutionIframe,
    handleLoadLeftIframe,
    handleLoadRightIframe,
  } = useCssBattle();

  const handleClick = useCallback(() => {
    const compressedDataUrl = compress(leftImgRef.current?.src ?? '');
    dispatch(roomActions.changeTaskImgDataUrl(compressedDataUrl));
  }, [leftImgRef, dispatch]);

  const isLoading = matchStats.status === 'loading';
  const showStats = hovered && matchStats.result[0]?.success && matchStats.status !== 'process';
  const showTargetControls = ['targetIsEmpty', 'targetIsInvalid'].includes(matchStats.status);

  return (
    <Box className="cb-card" h="100%" style={{ border: 0 }}>
      <Flex
        direction={{ base: 'column', md: 'row', lg: 'row', xl: 'row' }}
        justify="space-between"
        px="md"
        py="md"
      >
        <Box
          className="cb-card"
          style={{
            ...frameStyle,
            display: 'flex',
            flexDirection: 'column',
            margin: '0 4px',
          }}
        >
          <Box h="100%" pos="relative">
            {isLoading && (
              <Flex
                pos="absolute"
                className="cb-opacity-50"
                justify="center"
                align="center"
                h="100%"
                w="100%"
              >
                <Loading adaptive />
              </Flex>
            )}
            <Box pos="relative" h="100%" w="100%" className={cn({ 'cb-opacity-25': isLoading })}>
              <img
                alt=""
                title={i18n.t('Right editor solution picture')}
                className="cb-opacity-05"
                style={{
                  width: '100%',
                  height: '100%',
                  position: 'absolute',
                  visibility: isLoading ? 'hidden' : 'visible',
                }}
                ref={rightImgRef}
              />
              <img
                alt=""
                title={i18n.t('Left editor solution picture')}
                style={{
                  position: 'absolute',
                  visibility: isLoading ? 'hidden' : 'visible',
                  width: '100%',
                  height: '100%',
                }}
                ref={leftImgRef}
              />
              <iframe
                src="/cssbattle/builder"
                title={i18n.t('left editor solution')}
                style={{
                  position: 'absolute',
                  visibility: isLoading ? 'hidden' : 'visible',
                  border: 0,
                  width: '100%',
                  height: '100%',
                }}
                ref={leftSolutionIframe}
                onLoad={handleLoadLeftIframe}
              />
              <iframe
                src="/cssbattle/builder"
                title={i18n.t('right editor solution')}
                style={{
                  position: 'absolute',
                  visibility: isLoading ? 'hidden' : 'visible',
                  border: 0,
                  width: '100%',
                  height: '100%',
                }}
                ref={rightSolutionIframe}
                onLoad={handleLoadRightIframe}
              />
            </Box>
          </Box>
        </Box>
        <Box
          ref={ref}
          className="cb-card"
          style={{
            ...frameStyle,
            display: 'flex',
            flexDirection: 'column',
            margin: '0 4px',
          }}
        >
          <Box h="100%" pos="relative">
            <Flex
              pos="absolute"
              direction="column"
              justify="center"
              align="center"
              h="100%"
              w="100%"
              className={cn({ invisible: !showTargetControls })}
            >
              <Text mb="sm">
                {statusTitleMap[matchStats.status as keyof typeof statusTitleMap]}
              </Text>
              <Button color="cbSecondary" radius="md" onClick={handleClick}>
                Save current img
              </Button>
            </Flex>
            <Flex
              pos="absolute"
              direction="column"
              justify="center"
              align="center"
              ta="center"
              c="dimmed"
              h="100%"
              w="100%"
              className={cn('cb-opacity-75', {
                invisible: !showStats || showTargetControls || isLoading,
              })}
              style={{ fontSize: 'var(--mantine-font-size-xl)' }}
            >
              {matchStats.result[0]?.success ? '100%' : matchStats.result[0]?.matchPercentage}
            </Flex>
            <img
              alt=""
              title={i18n.t('target solution picture')}
              className={cn({ 'cb-opacity-50': showStats })}
              style={{
                width: '100%',
                height: '100%',
                position: 'absolute',
                visibility: showTargetControls || isLoading ? 'hidden' : 'visible',
              }}
              ref={targetImgRef}
            />
          </Box>
        </Box>
      </Flex>
    </Box>
  );
}

export default memo(CssBattleInfoPanel);
