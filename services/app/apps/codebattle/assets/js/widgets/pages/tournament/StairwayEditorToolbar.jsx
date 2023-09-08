import React, { useCallback, useMemo } from 'react';

import find from 'lodash/find';
import { useDispatch, useSelector } from 'react-redux';

import LanguagePickerView from '../../components/LanguagePickerView';
import { currentUserIdSelector } from '../../selectors';
import { actions } from '../../slices';
import DarkModeButton from '../game/DarkModeButton';
import GameActionButtons from '../game/GameActionButtons';
import VimModeButton from '../game/VimModeButton';

import PlayerPicker from './PlayerPicker';

const type = 'stairway';
const toolbarClassNames = 'btn-toolbar justify-content-between align-items-center m-1';
const editorSettingClassNames = 'btn-group align-items-center m-1';
const userInfoClassNames = 'btn-group align-items-center justify-content-end m-1';

function ModeButtons({ player }) {
  return (
    <div aria-label="Editor mode" className="btn-group align-items-center mr-auto" role="group">
      <VimModeButton player={player} />
      <DarkModeButton player={player} />
    </div>
  );
}

function StairwayEditorToolbar({ activePlayer, players, setActivePlayerId }) {
  const dispatch = useDispatch();

  const playerData = useSelector((state) =>
    find(state.stairwayGame.game?.players, { id: activePlayer.id }),
  );
  const currentUserId = useSelector(currentUserIdSelector);
  const changeLang = useCallback(
    ({ label: { props } }) => dispatch(actions.changeEditorLang({ editorLang: props.slug })),
    [dispatch],
  );
  const changePlayer = useCallback(
    ({ label: { props } }) => setActivePlayerId(props.user.id),
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
        <div aria-label="Editor settings" className={editorSettingClassNames} role="group">
          <LanguagePickerView
            changeLang={changeLang}
            currentLangSlug={playerData?.editorLang}
            isDisabled={isDisabledLanguagePicker}
          />
        </div>

        <ModeButtons player={activePlayer} />
        <GameActionButtons {...actionBtnsProps} />

        <div aria-label="User info" className={userInfoClassNames} role="group">
          <PlayerPicker
            activePlayer={activePlayer}
            changePlayer={changePlayer}
            isDisabled={isDisabledPlayerPicker}
            players={players}
          />
        </div>
      </div>
    </div>
  );
}

export default StairwayEditorToolbar;
