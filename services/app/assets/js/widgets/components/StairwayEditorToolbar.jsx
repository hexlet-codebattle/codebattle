import _ from 'lodash';
import React, { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Gon from 'gon';
import { actions } from '../slices';

import UserInfo from '../containers/UserInfo';
import LanguagePickerView from './LanguagePickerView';
import GameActionButtons from './GameActionButtons';
import VimModeButton from '../containers/EditorsToolbars/VimModeButton';
import DarkModeButton from '../containers/EditorsToolbars/DarkModeButton';
import { getSolution } from '../selectors';

    const type = 'stairway';
    const toolbarClassNames = 'btn-toolbar justify-content-between align-items-center m-1';
    const editorSettingClassNames = 'btn-group align-items-center m-1';
    const userInfoClassNames = 'btn-group align-items-center justify-content-end m-1';

const currentUser = Gon.getAsset('current_user');

const ModeButtons = ({ player }) => (
  <div
    className="btn-group align-items-center mr-auto"
    role="group"
    aria-label="Editor mode"
  >
    <VimModeButton player={player} />
    <DarkModeButton player={player} />
  </div>
);

const StairwayEditorToolbar = ({
    player,
 }) => {
  const dispatch = useDispatch();

  const solution = useSelector(getSolution(player.id));
  const changeLang = useCallback(editorLang => dispatch(actions.changeEditorLang({ editorLang })), [dispatch]);
  const isDisabledLanguagePicker = player.id === currentUser.id;
  const actionBtnsProps = {
    currentEditorLangSlug: solution.text.currentLangSlug,
    checkResult: () => {},
    checkBtnStatus: 'disabled',
    resetBtnStatus: 'disabled',
    giveUpBtnStatus: 'disabled',
  };

  return (
    <>
      <div data-player-type={type}>
        <div className={toolbarClassNames} role="toolbar">
          <div
            className={editorSettingClassNames}
            role="group"
            aria-label="Editor settings"
          >
            <LanguagePickerView
              isDisabled={isDisabledLanguagePicker}
              currentLangSlug={solution.text.currentLangSlug}
              changeLang={changeLang}
            />
          </div>

          <>
            <ModeButtons player={player} />
            <GameActionButtons {...actionBtnsProps} />
          </>

          <div className={userInfoClassNames} role="group" aria-label="User info">
            <UserInfo user={player} />
          </div>
        </div>
      </div>
    </>
  );
};

export default StairwayEditorToolbar;
