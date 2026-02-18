import React from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import cn from "classnames";
import { useDispatch, useSelector } from "react-redux";

import editorThemes from "../../config/editorThemes";
import { editorsThemeSelector } from "../../selectors";
import { actions } from "../../slices";

function DarkModeButton({ className = "btn btn-sm rounded-right" }) {
  const dispatch = useDispatch();

  const currentTheme = useSelector(editorsThemeSelector);

  const isDarkMode = currentTheme === editorThemes.dark;
  const mode = isDarkMode ? editorThemes.light : editorThemes.dark;

  const btnClassName = cn(className, {
    "btn-light": isDarkMode,
    "btn-secondary": !isDarkMode,
  });

  const handleToggleDarkMode = () => {
    dispatch(actions.switchEditorsTheme(mode));
  };

  return (
    <button type="button" className={btnClassName} onClick={handleToggleDarkMode}>
      <span className="invisible">1</span>
      <FontAwesomeIcon style={{ marginLeft: "-8px" }} icon={isDarkMode ? "sun" : "moon"} />
    </button>
  );
}

export default DarkModeButton;
