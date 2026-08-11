import React, { memo } from 'react';

import cn from 'classnames';
import { useSelector } from 'react-redux';

import {
  getPregressbarClass,
  getPregressbarWidth,
  type CheckResult,
} from '@/pages/lobby/GameProgressBar';

import EditorThemeCodes from '../config/editorThemes';
import * as selectors from '../selectors';

interface EditorGameBarProps {
  userId: number;
  theme?: string;
}

function EditorGameBar({ userId, theme }: EditorGameBarProps) {
  const checkResult = useSelector(
    selectors.executionOutputSelector(userId, undefined),
  ) as CheckResult;

  const backgroundColor = theme === EditorThemeCodes.light ? '#f8f9fa' : '#212529';

  return (
    <div
      title={checkResult.status}
      style={{
        display: 'flex',
        position: 'absolute',
        justifyContent: 'center',
        width: '100%',
        backgroundColor,
      }}
    >
      <div
        className="cb-editor-game-progress-bar"
        style={{
          borderRadius: '0 0 0.25rem 0.25rem',
          borderTop: 0,
          display: 'flex',
          justifyContent: 'center',
          paddingBottom: '0.5rem',
          paddingTop: '0.25rem',
          paddingLeft: '1rem',
          paddingRight: '1rem',
          backgroundColor,
          width: '100%',
        }}
      >
        <div className={getPregressbarClass({ checkResult })}>
          <div
            className="cb-asserts-progress"
            style={{
              width: getPregressbarWidth({ checkResult }),
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default memo(EditorGameBar);
