import React, { memo } from "react";

import NiceModal, { useModal } from "@ebay/nice-modal-react";
import cn from "classnames";
import i18n from "i18next";
import Button from "react-bootstrap/Button";
import { useSelector } from "react-redux";

import Modal from "@/components/BootstrapModal";
import TournamentDescription from "@/components/TournamentDescription";
import TournamentPreviewPanel from "@/components/TournamentPreviewPanel";
import { grades } from "@/config/grades";
import ModalCodes from "@/config/modalCodes";
import { currentUserIsAdminSelector } from "@/selectors";

import dayjs from "../../../i18n/dayjs";

export const TournamentModal = NiceModal.create(({ tournament }) => {
  const isAdmin = useSelector(currentUserIsAdminSelector);

  const modal = useModal(ModalCodes.tournamentModal);

  const isUpcoming = tournament?.grade === "upcoming";
  const start = dayjs(tournament.startsAt).toDate();
  const end = dayjs(tournament.startsAt).add(1, "hour").toDate();

  if (!tournament) {
    return <></>;
  }

  return (
    <Modal
      size="lg"
      show={modal.visible}
      onHide={modal.hide}
      contentClassName="cb-bg-panel cb-text"
    >
      <Modal.Header className="cb-border-color" closeButton>
        <Modal.Title className="d-flex flex-column">
          {tournament.grade !== grades.open && (
            <span className="text-white">Codebattle League 2025</span>
          )}
          {i18n.t("Tournament: %{name}", { name: tournament.name })}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="position-relative">
        <div className="d-flex flex-column">
          <TournamentPreviewPanel
            className="d-flex justify-content-center w-100 h-100"
            tournament={tournament}
            start={start}
            end={end}
          />
          <TournamentDescription
            className="d-flex flex-column align-items-center cb-rounded w-100 h-100 p-3"
            tournament={tournament}
          />
        </div>
      </Modal.Body>
      <Modal.Footer className="cb-border-color">
        {tournament.id && (
          <a
            href={isAdmin || !isUpcoming ? `/tournaments/${tournament.id}` : "blank"}
            className={cn("btn btn-secondary cb-btn-secondary pr-2 cb-rounded", {
              disabled: isUpcoming,
            })}
            disabled={isUpcoming}
          >
            {i18n.t("Open Tournament")}
          </a>
        )}
        <Button onClick={modal.hide} className="btn btn-secondary cb-btn-secondary cb-rounded">
          {i18n.t("Close")}
        </Button>
      </Modal.Footer>
    </Modal>
  );
});

export default memo(TournamentModal);
