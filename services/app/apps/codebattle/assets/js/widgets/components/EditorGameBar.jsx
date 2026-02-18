import React, { memo } from "react";

import cn from "classnames";
import { useSelector } from "react-redux";

import { getPregressbarClass, getPregressbarWidth } from "@/pages/lobby/GameProgressBar";

import EditorThemeCodes from "../config/editorThemes";
import * as selectors from "../selectors";

function EditorGameBar({ userId, theme }) {
  const checkResult = useSelector(selectors.executionOutputSelector(userId));

  const panelClassName = cn("d-flex position-absolute justify-content-center w-100", {
    "bg-white": theme === EditorThemeCodes.light,
    "bg-dark": theme === EditorThemeCodes.dark,
  });
  const editorBar = cn(
    "cb-editor-game-progress-bar rounded-bottom bg-light border-top-0",
    "d-flex justify-content-center pb-2 pt-1 px-4",
    {
      "bg-light": theme === EditorThemeCodes.light,
      "bg-dark": theme === EditorThemeCodes.dark,
    },
  );

  return (
    <div className={panelClassName} title={checkResult.status}>
      <div className={editorBar}>
        <div className={getPregressbarClass({ checkResult }, theme)}>
          <div
            className="cb-asserts-progress"
            style={{
              width: getPregressbarWidth({ checkResult, theme }),
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default memo(EditorGameBar);
