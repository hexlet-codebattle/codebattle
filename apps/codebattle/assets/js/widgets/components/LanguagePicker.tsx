import React, { useContext } from 'react';

import { useDispatch } from 'react-redux';

import { type AppDispatch } from '@/slices';

import { openedReplayerSelector } from '../machines/selectors';
import { sendCurrentLangAndSetTemplate } from '../middlewares/Room';
import useMachineStateSelector from '../utils/useMachineStateSelector';

import LanguagePickerView, { type LangOption } from './LanguagePickerView';
import RoomContext from './RoomContext';

interface LanguagePickerProps {
  status?: string;
  editor?: { currentLangSlug?: string };
}

function LanguagePicker({ status, editor }: LanguagePickerProps) {
  const dispatch = useDispatch<AppDispatch>();

  const { mainService } = useContext(RoomContext);
  const isOpenedReplayer = useMachineStateSelector(mainService, openedReplayerSelector);
  const changeLang = (option: LangOption | null) => {
    if (option) {
      dispatch(sendCurrentLangAndSetTemplate(option.slug));
    }
  };

  return (
    <LanguagePickerView
      isDisabled={isOpenedReplayer || status === 'disabled'}
      currentLangSlug={editor?.currentLangSlug || 'js'}
      changeLang={changeLang}
    />
  );
}

export default LanguagePicker;
