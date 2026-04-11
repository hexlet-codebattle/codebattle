import React, { useContext } from "react";

import { useDispatch } from "react-redux";

import { openedReplayerSelector } from "../machines/selectors";
import { sendCurrentLangAndSetTemplate } from "../middlewares/Room";
import useMachineStateSelector from "../utils/useMachineStateSelector";

import LanguagePickerView from "./LanguagePickerView";
import RoomContext from "./RoomContext";

function LanguagePicker({ status, editor }) {
  const dispatch = useDispatch();

  const { mainService } = useContext(RoomContext);
  const isOpenedReplayer = useMachineStateSelector(mainService, openedReplayerSelector);
  const changeLang = ({ label: { props } }) => {
    dispatch(sendCurrentLangAndSetTemplate(props.slug));
  };

  return (
    <LanguagePickerView
      isDisabled={isOpenedReplayer || status === "disabled"}
      currentLangSlug={editor?.currentLangSlug || "js"}
      changeLang={changeLang}
    />
  );
}

export default LanguagePicker;
