import React from 'react';

export default function BackToHomeButton({ handleClick }) {
  return (
    <button className="btn btn-secondary btn-block" onClick={handleClick} type="button">
      Back to home
    </button>
  );
}
