import React from "react";

import moment from "moment";

function InfoMessage({ text, time }) {
  return (
    <div className="d-flex align-items-baseline flex-wrap">
      <small className="text-muted text-small">{text}</small>
      <small className="text-muted text-small ml-auto">
        {time ? moment.unix(time).format("HH:mm:ss") : ""}
      </small>
    </div>
  );
}

export default InfoMessage;
