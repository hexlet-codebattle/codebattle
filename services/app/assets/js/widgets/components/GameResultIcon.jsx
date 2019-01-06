import React from 'react';

export default ({ resultUser1, resultUser2 }) => {
  console.log(resultUser1, resultUser2);
  if (resultUser1 === 'gave_up') {
    return (
      <div className="align-middle mr-2" data-toggle="tooltip" data-placement="left" title="Player gave up">
        <i className="fa fa-flag-o fa-lg align-middle" aria-hidden="true" />
      </div>
    );
  }

  if (resultUser1 === 'won' && resultUser2 !== 'gave_up') {
    return (
      <div className="align-middle mr-2" data-toggle="tooltip" data-placement="left" title="Player won">
        <i className="fa fa-trophy fa-lg text-warning align-middle" aria-hidden="true" />
      </div>
    );
  }

  return null;
};
