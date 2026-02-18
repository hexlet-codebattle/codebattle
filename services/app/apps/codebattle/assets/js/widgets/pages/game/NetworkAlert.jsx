import React, { useContext, memo } from "react";

import i18n from "i18next";

import RoomContext from "../../components/RoomContext";
import { isDisconnectedWithMessageSelector } from "../../machines/selectors";
import useMachineStateSelector from "../../utils/useMachineStateSelector";

function NetworkAlert() {
  const { mainService } = useContext(RoomContext);
  const isDisconnectedWithMessage = useMachineStateSelector(
    mainService,
    isDisconnectedWithMessageSelector,
  );

  if (isDisconnectedWithMessage) {
    return (
      <div className="mx-1 text-center">
        <div className="bg-warning">{i18n.t("Connection lost, please reload the page")}</div>
      </div>
    );
  }

  return <></>;
}

export default memo(NetworkAlert);
