import React from "react";

import i18next from "i18next";

function BackToEventButton() {
  const eventUrl = "/";
  const supportUrl = "https://t.me/+Z0_UGvNt_yE4ODcy";

  return (
    <>
      <a className="btn btn-secondary cb-btn-secondary btn-block cb-rounded" href={supportUrl}>
        {i18next.t("Support")}
      </a>
      <a className="btn btn-secondary cb-btn-secondary btn-block cb-rounded" href={eventUrl}>
        {i18next.t("Back to event")}
      </a>
    </>
  );
}

export default BackToEventButton;
