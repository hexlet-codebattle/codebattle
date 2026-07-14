import React, { useState, useCallback, memo } from 'react';

import cn from 'classnames';
import { camelizeKeys } from 'humps';
import qs from 'qs';
import { useDispatch, useSelector } from 'react-redux';
import AsyncSelect from 'react-select/async';

import i18n from '../../../i18n';
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

// react-select style callbacks receive its internal base style object and
// state; the lib's exported types are heavy generics, so we keep these `any`.
/* eslint-disable @typescript-eslint/no-explicit-any */
const opponentSelectStyles = {
  menu: (base: any) => ({
    ...base,
    backgroundColor: '#1c1c24',
  }),
  container: (base: any) => ({
    ...base,
    backgroundColor: '#1c1c24',
    color: 'white',
  }),
  indicatorSeparator: (base: any) => ({
    ...base,
    backgroundColor: '#dc3545',
  }),
  dropdownIndicator: (base: any) => ({
    ...base,
    color: '#dc3545',
    ':hover': {
      ...base[':hover'],
      color: '#e04d5b',
    },
  }),
  control: (base: any, state: any) => ({
    ...base,
    backgroundColor: '#1c1c24',
    borderColor: state.isFocused ? '#e04d5b' : '#dc3545',
    boxShadow: 'none',
    ':hover': {
      ...base[':hover'],
      borderColor: '#e04d5b',
      cursor: 'pointer',
    },
  }),
  input: (base: any) => ({
    ...base,
    color: 'white',
  }),
  singleValue: (base: any) => ({
    ...base,
    color: 'white',
  }),
  option: (base: any, state: any) => ({
    ...base,
    backgroundColor: state.isFocused ? '#2a2a35' : '#1c1c24',
    color: 'white',
    ':hover': {
      ...base[':hover'],
      cursor: 'pointer',
      backgroundColor: '#2a2a35',
    },
  }),
};
/* eslint-enable @typescript-eslint/no-explicit-any */

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

interface OpponentOption {
  label: React.ReactNode;
  value: Opponent;
}

interface OpponentSelectProps {
  setOpponent: (opponent: Opponent) => void;
  opponent?: Opponent | null;
}

const OpponentSelect = memo(({ setOpponent, opponent }: OpponentSelectProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const currentUserId = useSelector(selectors.currentUserIdSelector);
  const { presenceList } = useSelector(selectors.lobbyDataSelector);

  const loadOptions = useCallback(
    (inputValue: string, callback: (options: OpponentOption[]) => void) => {
      const queryParamsString = qs.stringify({
        q: {
          name_ilike: inputValue,
        },
      });

      fetch(`/api/v1/users?${queryParamsString}`)
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
          }

          return response.json();
        })
        .then((data) => {
          const { users: apiUsers } = camelizeKeys(data) as { users: Opponent[] };
          const presence = presenceList as Array<{ id: number | string; user: Opponent }>;
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

          const sortedUsers = combinedUsers.sort((a, b) => {
            const aOnline = a.online;
            const bOnline = b.online;
            if (aOnline === bOnline) {
              return 0;
            }
            return aOnline ? -1 : 1;
          });

          const options = sortedUsers.map((user) => ({
            label: <UserLabel user={user} />,
            value: user,
          }));

          callback(options);
        })
        .catch((error) => {
          dispatch(actions.setError(error));
        });
    },
    [currentUserId, dispatch, presenceList],
  );

  return (
    <AsyncSelect<OpponentOption>
      className="w-100"
      styles={opponentSelectStyles}
      value={
        opponent
          ? {
              label: <UserLabel user={opponent} />,
              value: opponent,
            }
          : null
      }
      defaultOptions
      onChange={(option) => {
        if (option) {
          setOpponent(option.value);
        }
      }}
      loadOptions={loadOptions}
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
    return cn('btn border-0 bg-gray cb-rounded w-100', {
      'bg-orange': isLevelActive,
      'btn-outline-orange': !isLevelActive,
    });
  };

  const changeGameLevel = (level: string) => {
    if (level === value) return;
    onChange(level);
  };

  return (
    <div className="row px-sm-3 px-md-5 mx-n1">
      {gameLevels.map((level) => (
        <div key={level} className="col-6 col-sm-3 px-1 mb-2">
          <button
            type="button"
            className={getLevelClassName(level)}
            onClick={() => changeGameLevel(level)}
            data-toggle="tooltip"
            data-placement="right"
            title={level}
          >
            <img alt={level} src={`/assets/images/levels/${level}.svg`} />
          </button>
        </div>
      ))}
    </div>
  );
});

interface GameTypeButtonGroupProps {
  value: string;
  onChange: (gameType: string) => void;
}

const GameTypeButtonGroup = memo(({ value, onChange }: GameTypeButtonGroupProps) => {
  const getGameTypeClassName = (gameType: string) => {
    const isGameTypeActive = gameType === value;
    return cn('btn cb-rounded w-100', {
      'bg-orange text-white': isGameTypeActive,
      'btn-outline-orange': !isGameTypeActive,
    });
  };

  return (
    <div className="row px-sm-3 px-md-5 mt-3 mx-n1">
      {gameTypeCodes.map((gameTypeCode) => (
        <div key={gameTypeCode} className="col-12 col-md-4 px-1 mb-2">
          <button
            type="button"
            className={getGameTypeClassName(gameTypeCode)}
            onClick={() => onChange(gameTypeCode)}
          >
            {gameTypeNames[gameTypeCode as keyof typeof gameTypeNames]}
          </button>
        </div>
      ))}
    </div>
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
          <h5 className="mb-0">{i18n.t('Level')}</h5>
        </div>
        <LevelButtonGroup value={gameLevel} onChange={switchGameLevel} />
      </div>
      <div className="cb-create-game__section">
        <div className="cb-create-game__section-title">
          <h5 className="mb-0">{i18n.t('Game Type')}</h5>
        </div>
        <GameTypeButtonGroup value={gameType} onChange={setGameType} />
      </div>
      <div className="cb-create-game__section">
        <div className="cb-create-game__section-title cb-create-game__section-title--with-value">
          <h5 className="mb-0">{i18n.t('Time control')}</h5>
          <span className="cb-create-game__time-value">{i18n.t(`${timeoutMinutes} min`)}</span>
        </div>
        <div className="px-sm-3 px-md-5 mt-3">
          <input
            type="range"
            aria-label={i18n.t('Time control')}
            className="form-range w-100 cb-range"
            value={timeoutMinutes}
            onChange={handleTimeoutChange}
            min={TIMEOUT_MIN}
            max={TIMEOUT_MAX}
            step="1"
            id="customRange3"
            style={{ '--range-progress': `${timeoutPercent}%` } as React.CSSProperties}
          />
        </div>
      </div>
      {isInvite && (
        <div className="cb-create-game__section">
          <div className="cb-create-game__section-title">
            <h5 className="mb-0">{i18n.t('Choose opponent')}</h5>
          </div>
          <div className="px-sm-3 px-md-5 mt-3">
            <OpponentSelect setOpponent={setOpponent} opponent={opponent} />
          </div>
        </div>
      )}
      <div className="cb-create-game__section">
        <div className="cb-create-game__section-title">
          <h5 className="mb-0">{i18n.t('Choose task by name or tags')}</h5>
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
        <button
          type="button"
          className="btn btn-secondary cb-btn-secondary cb-rounded px-4"
          onClick={createGame}
          disabled={isInvite && !opponent}
        >
          {isInvite ? i18n.t('Create invite') : i18n.t('Create battle')}
        </button>
      </div>
    </div>
  );
}

export default CreateGameDialog;
