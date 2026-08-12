import React, { useState, useCallback, memo } from 'react';

import { Box, Button, Grid, Title } from '@mantine/core';
import cn from 'classnames';
import { camelizeKeys } from 'humps';
import qs from 'qs';
import { useDispatch, useSelector } from 'react-redux';

import i18n from '../../../i18n';
import CbSelect from '../../components/CbSelect';
import UserLabel from '../../components/UserLabel';
import levelRatio from '../../config/levelRatio';
import * as invitesMiddleware from '../../middlewares/Invite';
import * as lobbyMiddlewares from '../../middlewares/Lobby';
import * as selectors from '../../selectors';
import { actions, type AppDispatch } from '../../slices';

import TaskChoice from './TaskChoice';

const TIMEOUT = 480;
const TIMEOUT_MIN = 1;
const TIMEOUT_MAX = 60;
const gameLevels = Object.keys(levelRatio);
const gameTypeNames = {
  other_user: i18n.t('With other user'),
  invite: i18n.t('With a friend'),
  bot: i18n.t('With a bot'),
};
const gameTypeCodes = Object.keys(gameTypeNames);
const defaultGameOptions = {
  level: gameLevels[0],
  type: gameTypeCodes[0],
  timeoutSeconds: TIMEOUT,
};
const unchosenTask: ChosenTask = { id: null };

interface Opponent {
  id: number;
  name: string;
  online?: boolean;
  [key: string]: unknown;
}

interface ChosenTask {
  id: number | null;
  name?: string;
  origin?: string;
  tags?: string[];
  [key: string]: unknown;
}

interface OpponentSelectProps {
  setOpponent: (opponent: Opponent) => void;
  opponent?: Opponent | null;
}

const renderUserLabel = (user: Opponent) => <UserLabel user={user} />;

const OpponentSelect = memo(({ setOpponent, opponent }: OpponentSelectProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const currentUserId = useSelector(selectors.currentUserIdSelector);
  const { presenceList } = useSelector(selectors.lobbyDataSelector);

  const loadOptions = useCallback(
    async (inputValue: string): Promise<Opponent[]> => {
      try {
        const queryParamsString = qs.stringify({
          q: {
            name_ilike: inputValue,
          },
        });

        const response = await fetch(`/api/v1/users?${queryParamsString}`);

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data = await response.json();
        const { users: apiUsers } = camelizeKeys(data) as {
          users: Opponent[];
        };
        const presence = presenceList as Array<{
          id: number | string;
          user: Opponent;
        }>;
        const filteredApiUsers = apiUsers.filter(({ id }) => id !== currentUserId);
        const onlineUsersFromPresence = presence
          .map((p) => p.user)
          .filter((user) => user.id !== currentUserId);
        const combinedUsersMap = new Map<number, Opponent>();

        filteredApiUsers.forEach((user) => {
          const isOnline = presence.some((p) => String(p.id) === String(user.id));
          combinedUsersMap.set(user.id, { ...user, online: isOnline });
        });

        onlineUsersFromPresence.forEach((onlineUser) => {
          if (!combinedUsersMap.has(onlineUser.id)) {
            combinedUsersMap.set(onlineUser.id, {
              ...onlineUser,
              online: true,
            });
          }
        });

        const combinedUsers = Array.from(combinedUsersMap.values());

        return combinedUsers.sort((a, b) => {
          const aOnline = a.online;
          const bOnline = b.online;
          if (aOnline === bOnline) {
            return 0;
          }
          return aOnline ? -1 : 1;
        });
      } catch (error) {
        dispatch(actions.setError(error));
        return [];
      }
    },
    [currentUserId, dispatch, presenceList],
  );

  return (
    <CbSelect<Opponent>
      value={opponent ?? null}
      onChange={(user) => user && setOpponent(user)}
      loadOptions={loadOptions}
      defaultOptions
      getOptionLabel={renderUserLabel}
      getOptionValue={(user) => String(user.id)}
      classNames={{
        target: 'cb-select-danger-input',
        dropdown: 'cb-select-danger-dropdown',
        option: 'cb-select-danger-option',
      }}
    />
  );
});

interface LevelButtonGroupProps {
  value: string;
  onChange: (level: string) => void;
}

const LevelButtonGroup = memo(({ value, onChange }: LevelButtonGroupProps) => {
  const getLevelClassName = (level: string) => {
    const isLevelActive = level === value;
    return cn('bg-gray', {
      'bg-orange': isLevelActive,
      'btn-outline-orange': !isLevelActive,
    });
  };

  const changeGameLevel = (level: string) => {
    if (level === value) return;
    onChange(level);
  };

  return (
    <Grid gap="xs" px={{ base: 0, sm: 'md', md: 'xl' }}>
      {gameLevels.map((level) => (
        <Grid.Col key={level} span={{ base: 6, sm: 3 }}>
          <Button
            fullWidth
            p={0}
            className={getLevelClassName(level)}
            onClick={() => changeGameLevel(level)}
            title={level}
          >
            <img alt={level} src={`/assets/images/levels/${level}.svg`} />
          </Button>
        </Grid.Col>
      ))}
    </Grid>
  );
});

interface GameTypeButtonGroupProps {
  value: string;
  onChange: (gameType: string) => void;
}

const GameTypeButtonGroup = memo(({ value, onChange }: GameTypeButtonGroupProps) => {
  const getGameTypeClassName = (gameType: string) => {
    const isGameTypeActive = gameType === value;
    return cn({
      'bg-orange': isGameTypeActive,
      'btn-outline-orange': !isGameTypeActive,
    });
  };

  return (
    <Grid gap="xs" mt="md" px={{ base: 0, sm: 'md', md: 'xl' }}>
      {gameTypeCodes.map((gameTypeCode) => (
        <Grid.Col key={gameTypeCode} span={{ base: 12, md: 4 }}>
          <Button
            fullWidth
            className={getGameTypeClassName(gameTypeCode)}
            onClick={() => onChange(gameTypeCode)}
          >
            {gameTypeNames[gameTypeCode as keyof typeof gameTypeNames]}
          </Button>
        </Grid.Col>
      ))}
    </Grid>
  );
});

interface CreateGameDialogProps {
  hideModal: () => void;
}

function CreateGameDialog({ hideModal }: CreateGameDialogProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { gameOptions: givenGameOptions, opponentInfo } = useSelector(selectors.modalSelector);
  const [opponent, setOpponent] = useState<Opponent | null>(
    (opponentInfo as Opponent | null) ?? null,
  );
  const [chosenTask, setChosenTask] = useState<ChosenTask>(unchosenTask);
  const [chosenTags, setChosenTags] = useState<string[]>([]);

  const gameOptions = { ...defaultGameOptions, ...givenGameOptions };
  const [gameLevel, setGameLevel] = useState(gameOptions.level);
  const [gameType, setGameType] = useState(gameOptions.type);
  const [gameTimeout, setGameTimeout] = useState(gameOptions.timeoutSeconds);

  const isInvite = gameType === 'invite';
  const isTaskChosen = chosenTask.id !== null;

  const handleTimeoutChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setGameTimeout(Number(e.target.value) * 60),
    [setGameTimeout],
  );

  const switchGameLevel = useCallback(
    (level: string) => {
      setGameLevel(level);
      setChosenTask(unchosenTask);
      setChosenTags([]);
    },
    [setGameLevel, setChosenTask, setChosenTags],
  );

  const createGame = () => {
    if (isInvite && opponent) {
      dispatch(
        invitesMiddleware.createInvite({
          level: gameLevel,
          timeout_seconds: gameTimeout,
          recipient_id: opponent.id,
          recipient_name: opponent.name,
          task_id: chosenTask.id,
          task_tags: isTaskChosen ? [] : chosenTags,
        }),
      );
    } else if (!isInvite) {
      lobbyMiddlewares.createGame({
        level: gameLevel,
        opponent_type: gameType,
        timeout_seconds: gameTimeout,
        task_id: chosenTask.id,
        task_tags: isTaskChosen ? [] : chosenTags,
      });
    }
    hideModal();
  };

  const timeoutMinutes = gameTimeout / 60;
  const timeoutPercent = Math.min(
    100,
    Math.max(0, ((timeoutMinutes - TIMEOUT_MIN) / (TIMEOUT_MAX - TIMEOUT_MIN)) * 100),
  );

  return (
    <div className="cb-create-game">
      <div className="cb-create-game__section">
        <div className="cb-create-game__section-title">
          <Title order={5} mb={0}>
            {i18n.t('Level')}
          </Title>
        </div>
        <LevelButtonGroup value={gameLevel} onChange={switchGameLevel} />
      </div>
      <div className="cb-create-game__section">
        <div className="cb-create-game__section-title">
          <Title order={5} mb={0}>
            {i18n.t('Game Type')}
          </Title>
        </div>
        <GameTypeButtonGroup value={gameType} onChange={setGameType} />
      </div>
      <div className="cb-create-game__section">
        <div className="cb-create-game__section-title cb-create-game__section-title--with-value">
          <Title order={5} mb={0}>
            {i18n.t('Time control')}
          </Title>
          <span className="cb-create-game__time-value">
            {i18n.t('%{count} min', { count: timeoutMinutes })}
          </span>
        </div>
        <Box mt="md" px={{ base: 0, sm: 'md', md: 'xl' }}>
          <input
            type="range"
            aria-label={i18n.t('Time control')}
            className="cb-range"
            value={timeoutMinutes}
            onChange={handleTimeoutChange}
            min={TIMEOUT_MIN}
            max={TIMEOUT_MAX}
            step="1"
            id="customRange3"
            style={
              {
                width: '100%',
                '--range-progress': `${timeoutPercent}%`,
              } as React.CSSProperties
            }
          />
        </Box>
      </div>
      {isInvite && (
        <div className="cb-create-game__section">
          <div className="cb-create-game__section-title">
            <Title order={5} mb={0}>
              {i18n.t('Choose opponent')}
            </Title>
          </div>
          <Box mt="md" px={{ base: 0, sm: 'md', md: 'xl' }}>
            <OpponentSelect setOpponent={setOpponent} opponent={opponent} />
          </Box>
        </div>
      )}
      <div className="cb-create-game__section">
        <div className="cb-create-game__section-title">
          <Title order={5} mb={0}>
            {i18n.t('Choose task by name or tags')}
          </Title>
        </div>
        <TaskChoice
          chosenTask={chosenTask}
          setChosenTask={setChosenTask}
          chosenTags={chosenTags}
          setChosenTags={setChosenTags}
          level={gameLevel}
        />
      </div>
      <div className="cb-create-game__footer">
        <Button color="cbSecondary" px="lg" onClick={createGame} disabled={isInvite && !opponent}>
          {isInvite ? i18n.t('Create invite') : i18n.t('Create battle')}
        </Button>
      </div>
    </div>
  );
}

export default CreateGameDialog;
