import React from 'react';
import { sendRejectToRematch } from '../../middlewares/Game';

const handleClick = (isRejectRequired = true) => () => {
  if (isRejectRequired) {
    sendRejectToRematch();
  }
  window.location = '/';
};

export default function BackToHomeButton({ isRejectRequired }) {
  return (
    <button className="btn btn-secondary btn-block" onClick={handleClick(isRejectRequired)} type="button">
      Back to home
    </button>
  );
}
