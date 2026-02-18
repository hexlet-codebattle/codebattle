import React, { memo, useCallback, useState } from "react";

import NiceModal, { useModal } from "@ebay/nice-modal-react";
import cn from "classnames";
import i18n from "i18next";
import Button from "react-bootstrap/Button";
import { useSelector } from "react-redux";

import Modal from "@/components/BootstrapModal";
import ScheduleNavigationTab from "@/components/ScheduleNavigationBar";
import TournamentDescription from "@/components/TournamentDescription";
import TournamentPreviewPanel from "@/components/TournamentPreviewPanel";
import { grades } from "@/config/grades";
import ModalCodes from "@/config/modalCodes";
import { currentUserIsAdminSelector } from "@/selectors";

export const EventModal = NiceModal.create(({ event: selectedEvent, events, clearEvent }) => {
  const [currentEvent, setCurrentEvent] = useState();

  const isAdmin = useSelector(currentUserIsAdminSelector);

  const modal = useModal(ModalCodes.calendarEventModal);

  const event = currentEvent || selectedEvent;
  const isUpcoming = event?.resourse?.grade === "upcoming";
  const handleClose = useCallback(() => {
    modal.hide();
    clearEvent();
  }, [modal, clearEvent]);

  return (
    <Modal
      size="lg"
      show={modal.visible}
      onHide={modal.hide}
      contentClassName="cb-bg-panel cb-text"
    >
      <Modal.Header className="cb-border-color" closeButton>
        <Modal.Title className="d-flex flex-column">
          {event.resourse.grade !== grades.open && (
            <span className="text-white">Codebattle League 2025</span>
          )}
          {i18n.t("Tournament: %{name}", { name: event.title })}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="d-flex flex-column">
          <ScheduleNavigationTab
            className="w-100 d-flex justify-content-between p-2"
            events={events}
            event={event}
            setEvent={setCurrentEvent}
          />
          <TournamentPreviewPanel
            className="d-flex justify-content-center w-100 h-100"
            tournament={event.resourse}
            start={event.start}
            end={event.end}
          />
          <TournamentDescription
            className="d-flex flex-column align-items-center cb-rounded w-100 h-100 p-3"
            tournament={event.resourse}
          />
        </div>
      </Modal.Body>
      <Modal.Footer className="cb-border-color">
        {event.resourse.id && (
          <a
            href={isAdmin || !isUpcoming ? `/tournaments/${event.resourse.id}` : "blank"}
            className={cn("btn btn-secondary cb-btn-secondary pr-2 cb-rounded", {
              disabled: isUpcoming,
            })}
            disabled={isUpcoming}
          >
            {i18n.t("Open Tournament")}
          </a>
        )}
        <Button onClick={handleClose} className="btn btn-secondary cb-btn-secondary cb-rounded">
          {i18n.t("Close")}
        </Button>
      </Modal.Footer>
    </Modal>
  );
});

export default memo(EventModal);
