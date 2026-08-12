import React, { memo, useCallback, useEffect, useContext, useState } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ActionIcon, Badge, Box, Collapse, Flex, Text } from '@mantine/core';
import i18next from 'i18next';
import { useDispatch, useSelector } from 'react-redux';

import CustomEventStylesContext from '@/components/CustomEventStylesContext';
import LanguageIcon from '@/components/LanguageIcon';
import { requestMatchesByPlayerId } from '@/middlewares/Tournament';
import { currentUserCanModerateTournament } from '@/selectors';
import { type AppDispatch } from '@/slices/store';

import UsersMatchList from './UsersMatchList';

interface TournamentUserPanelProps {
  matches: unknown;
  currentUserId: number;
  userId: number;
  name?: string;
  score?: number;
  place?: number;
  winsCount?: number;
  lang?: string;
  isBanned?: boolean;
  searchedUserId?: number;
  hideBots?: boolean;
}

function TournamentUserPanel({
  matches,
  currentUserId,
  userId,
  name,
  score,
  place,
  winsCount,
  lang,
  isBanned = false,
  searchedUserId = 0,
  hideBots,
}: TournamentUserPanelProps) {
  const dispatch = useDispatch<AppDispatch>();
  const [open, setOpen] = useState(false);

  const canModerate = useSelector(currentUserCanModerateTournament);

  const hasCustomEventStyles = useContext(CustomEventStylesContext);

  const searchBadgeClass = hasCustomEventStyles ? 'cb-custom-event-badge-primary' : undefined;
  const playerBadgeClass = hasCustomEventStyles ? 'cb-custom-event-badge-success' : undefined;

  const panelBorderColor = (() => {
    if (userId === currentUserId) {
      return hasCustomEventStyles ? '#2a7053' : '#28a745';
    }

    if (userId === searchedUserId) {
      return hasCustomEventStyles ? '#34b4fe' : '#007bff';
    }

    return undefined;
  })();

  const handleOpenMatches = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      if (!open && userId !== currentUserId) {
        dispatch(requestMatchesByPlayerId(userId));
      }

      setOpen(!open);
    },
    [open, setOpen, dispatch, userId, currentUserId],
  );

  useEffect(() => {
    if (open) {
      dispatch(requestMatchesByPlayerId(userId));
    }
  }, [open, dispatch, userId]);

  return (
    <Box
      style={{
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid var(--mantine-color-default-border)',
        borderColor: panelBorderColor,
        boxShadow: 'var(--mantine-shadow-sm)',
        borderRadius: '0.3rem',
        marginBottom: '0.5rem',
      }}
    >
      <Flex
        align="center"
        justify="flex-start"
        px="xs"
        py={4}
        onClick={handleOpenMatches}
        aria-hidden
        aria-expanded={open}
        aria-controls={`collapse-matches-${userId}`}
        style={{ cursor: 'pointer' }}
      >
        <div className="cb-user-panel-head" style={{ flexGrow: 1, minWidth: 0 }}>
          {place != null && place > 0 && (
            <span className="cb-user-panel-place" title={i18next.t('Place')}>
              {`#${place}`}
            </span>
          )}
          <Text
            component="span"
            className="cb-user-panel-name"
            style={{ whiteSpace: 'nowrap' }}
            title={name}
          >
            {searchedUserId === userId && (
              <Badge color="blue" className={searchBadgeClass} mr="xs">
                {i18next.t('Search')}
              </Badge>
            )}
            {currentUserId === userId && (
              <Badge color="green" className={playerBadgeClass} mr="xs">
                {i18next.t('you')}
              </Badge>
            )}
            <Box component="span" mr={4}>
              <LanguageIcon lang={lang} />
            </Box>
            {name}
            {isBanned && (
              <FontAwesomeIcon
                icon="ban"
                style={{ marginLeft: 8, color: 'var(--mantine-color-red-6)' }}
              />
            )}
          </Text>
          <Text component="span" className="cb-user-panel-stat" style={{ whiteSpace: 'nowrap' }}>
            {i18next.t('Score')}
            {': '}
            <strong className="cb-user-panel-stat-value">{score ?? 0}</strong>
          </Text>
          <Text component="span" className="cb-user-panel-stat" style={{ whiteSpace: 'nowrap' }}>
            {i18next.t('Wins')}
            {': '}
            <strong className="cb-user-panel-stat-value">{winsCount ?? 0}</strong>
          </Text>
        </div>
        <Flex ml="xs">
          <ActionIcon variant="transparent" onClick={handleOpenMatches}>
            <FontAwesomeIcon
              color="var(--mantine-color-cbText-6)"
              icon={open ? 'chevron-up' : 'chevron-down'}
            />
          </ActionIcon>
        </Flex>
      </Flex>
      <Collapse expanded={open}>
        <Box
          id={`collapse-matches-${userId}`}
          style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
        >
          <UsersMatchList
            currentUserId={currentUserId}
            playerId={userId}
            matches={matches as React.ComponentProps<typeof UsersMatchList>['matches']}
            canModerate={canModerate}
            hideBots={hideBots}
            hideStats
            showScore
            // `isBanned`/`canBan` are ignored by UsersMatchList but passed for parity with the
            // original JS; spread to bypass JSX excess-property checks without changing runtime.
            {...({
              isBanned,
              canBan: canModerate && userId !== currentUserId,
            } as object)}
          />
        </Box>
      </Collapse>
    </Box>
  );
}

export default memo(TournamentUserPanel);
