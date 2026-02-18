import React, { useCallback, useMemo, memo, useContext } from "react";

import cn from "classnames";
import omit from "lodash/omit";
import Button from "react-bootstrap/Button";

import Modal from "@/components/BootstrapModal";

import CustomEventStylesContext from "../../components/CustomEventStylesContext";

function DetailsModal({ tournament, modalShowing, setModalShowing }) {
  const tournamentDetailsStr = useMemo(
    () =>
      JSON.stringify(
        omit(tournament, [
          "players",
          "matches",
          "insertedAt",
          "updatedAt",
          "module",
          "currentRoundPosition",
          "description",
          "channel",
          "currentPlayerId",
          "topPlayerIds",
        ]),
        null,
        2,
      ),
    [tournament],
  );
  const hasCustomEventStyles = useContext(CustomEventStylesContext);

  const closeBtnClassName = cn("btn rounded-lg", {
    "btn-secondary": !hasCustomEventStyles,
    "cb-custome-event-btn-secondary": !hasCustomEventStyles,
  });

  const handleCancel = useCallback(() => setModalShowing(false), [setModalShowing]);

  return (
    <Modal contentClassName="cb-bg-panel cb-text" show={modalShowing} onHide={handleCancel}>
      <Modal.Header className="cb-border-color" closeButton>
        <Modal.Title>Tournament details</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <pre className="cb-bg-highlight-panel cb-rounded p-3 text-white">
          {tournamentDetailsStr}
        </pre>
      </Modal.Body>
      <Modal.Footer className="cb-border-color">
        <Button onClick={handleCancel} className={closeBtnClassName}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default memo(DetailsModal);
