import React, { useCallback, useMemo } from 'react';

import find from 'lodash/find';
import { useDispatch, useSelector } from 'react-redux';

import LanguagePickerView from '../../components/LanguagePickerView';
import { currentUserIdSelector } from '../../selectors';
import { actions } from '../../slices';
import DarkModeButton from '../game/DarkModeButton';
import GameActionButtons from '../game/GameActionButtons';

import { type Player } from '@/slices/initial';
import { type RootState } from '@/slices/store';

import PlayerPicker from './PlayerPicker';

const type = 'stairway';
const toolbarClassNames = 'btn-toolbar justify-content-between align-items-center m-1';
const editorSettingClassNames = 'btn-group align-items-center m-1';
const userInfoClassNames = 'btn-group align-items-center justify-content-end m-1';

interface StairwayPlayer extends Player {
  editorLang?: string;
}

interface ModeButtonsProps {
  player: StairwayPlayer;
}

function ModeButtons({ player }: ModeButtonsProps) {
  return (
    <div className="btn-group align-items-center mr-auto" role="group" aria-label="Editor mode">
      <DarkModeButton player={player} />
    </div>
  );
}

// react-select passes an option whose `label` is the rendered React element; the
// toolbar reads the element's props to recover the slug / user chosen.
interface PickerOption {
  label: { props: { slug?: string; user?: { id: number } } };
}

interface StairwayEditorToolbarProps {
  activePlayer: StairwayPlayer;
  setActivePlayerId: (id: number) => void;
  players: StairwayPlayer[];
}

function StairwayEditorToolbar({
  activePlayer,
  setActivePlayerId,
  players,
}: StairwayEditorToolbarProps) {
  const dispatch = useDispatch();

  const playerData = useSelector((state: RootState) =>
    find((state.stairwayGame.game as { players?: StairwayPlayer[] } | null)?.players, {
      id: activePlayer.id,
    }),
  ) as StairwayPlayer | undefined;
  const currentUserId = useSelector(currentUserIdSelector);
  const changeLang = useCallback(
    ({ label: { props } }: PickerOption) =>
      // @ts-expect-error changeEditorLang is not defined on the aggregated slice actions
      dispatch(actions.changeEditorLang({ editorLang: props.slug })),
    [dispatch],
  ) as unknown as React.ComponentProps<typeof LanguagePickerView>['changeLang'];
  const changePlayer = useCallback(
    ({ label: { props } }: PickerOption) => setActivePlayerId(props.user!.id),
    [setActivePlayerId],
  );
  const isDisabledLanguagePicker = activePlayer.id !== currentUserId;
  const isDisabledPlayerPicker = useMemo(
    () => players.some((player) => player.id === currentUserId),
    [players, currentUserId],
  );
  const actionBtnsProps = {
    currentEditorLangSlug: playerData?.editorLang,
    checkResult: () => {},
    checkBtnStatus: 'disabled',
    resetBtnStatus: 'disabled',
    giveUpBtnStatus: 'disabled',
  };

  return (
    <div data-player-type={type}>
      <div className={toolbarClassNames} role="toolbar">
        <div className={editorSettingClassNames} role="group" aria-label="Editor settings">
          <LanguagePickerView
            isDisabled={isDisabledLanguagePicker}
            currentLangSlug={playerData?.editorLang ?? ''}
            changeLang={changeLang}
          />
        </div>

        <ModeButtons player={activePlayer} />
        {/* @ts-expect-error legacy stairway toolbar omits GameActionButtons' showGiveUpBtn */}
        <GameActionButtons {...actionBtnsProps} />

        <div className={userInfoClassNames} role="group" aria-label="User info">
          <PlayerPicker
            isDisabled={isDisabledPlayerPicker}
            players={players}
            changePlayer={changePlayer as (...args: unknown[]) => void}
            activePlayer={activePlayer}
          />
        </div>
      </div>
    </div>
  );
}

export default StairwayEditorToolbar;
