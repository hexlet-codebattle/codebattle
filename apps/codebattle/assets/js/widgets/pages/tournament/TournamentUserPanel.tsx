import React, { memo, useCallback, useEffect, useContext, useState } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ActionIcon, Badge, Box, Collapse, Flex } from '@mantine/core';
import cn from 'classnames';
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

  const panelClassName = cn(
    'cb-border-color shadow-sm rounded-lg mb-2 overflow-auto',
    hasCustomEventStyles
      ? {
          'cb-custom-event-border-success': userId === currentUserId,
          'cb-custom-event-border-info': userId === searchedUserId,
        }
      : {
          'border-success': userId === currentUserId,
          'border-primary': userId === searchedUserId,
        },
  );

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
      className={panelClassName}
      style={{
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid var(--mantine-color-default-border)',
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
        <div className="cb-user-panel-head flex-grow-1 min-w-0">
          {place != null && place > 0 && (
            <span className="cb-user-panel-place" title={i18next.t('Place')}>
              {`#${place}`}
            </span>
          )}
          <span className="cb-user-panel-name text-nowrap" title={name}>
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
            <LanguageIcon className="mr-1" lang={lang} />
            {name}
            {isBanned && <FontAwesomeIcon className="ml-2 text-danger" icon="ban" />}
          </span>
          <span className="cb-user-panel-stat text-nowrap">
            {i18next.t('Score')}
            {': '}
            <strong className="cb-user-panel-stat-value">{score ?? 0}</strong>
          </span>
          <span className="cb-user-panel-stat text-nowrap">
            {i18next.t('Wins')}
            {': '}
            <strong className="cb-user-panel-stat-value">{winsCount ?? 0}</strong>
          </span>
        </div>
        <Flex ml="xs">
          <ActionIcon variant="transparent" onClick={handleOpenMatches}>
            <FontAwesomeIcon className="cb-text" icon={open ? 'chevron-up' : 'chevron-down'} />
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
            {...({ isBanned, canBan: canModerate && userId !== currentUserId } as object)}
          />
        </Box>
      </Collapse>
    </Box>
  );
}

export default memo(TournamentUserPanel);
