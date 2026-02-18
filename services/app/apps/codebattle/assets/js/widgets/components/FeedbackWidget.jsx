import React, { useCallback, memo, useMemo, useState } from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Button from "react-bootstrap/Button";
import { useDispatch, useSelector } from "react-redux";

import i18n from "../../i18n";
import AlertCodes from "../config/alertCodes";
import { currentUserNameSelector } from "../selectors/index";
import { actions } from "../slices";

import Modal from "./BootstrapModal";

const sendToServer = (payload) =>
  fetch("/api/v1/feedback", {
    method: "POST",
    headers: {
      "Content-type": "application/json",
      "x-csrf-token": window.csrf_token,
    },
    body: JSON.stringify(payload),
  });

const STATUS_OPTIONS = ["Bug", "Suggestion", "Question"];

function FeedbackWidget() {
  const dispatch = useDispatch();
  const currentUserName = useSelector(currentUserNameSelector);
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState(STATUS_OPTIONS[0]);
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addAlert = useCallback(
    (alertCode) => {
      dispatch(actions.addAlert({ [Date.now()]: alertCode }));
    },
    [dispatch],
  );

  const isSubmitDisabled = useMemo(() => !text.trim() || isSubmitting, [isSubmitting, text]);

  const closeModal = useCallback(() => {
    if (isSubmitting) return;
    setIsOpen(false);
  }, [isSubmitting]);

  const onSubmit = useCallback(
    (event) => {
      event.preventDefault();

      setIsSubmitting(true);
      const payload = {
        attachments: [
          {
            author_name: currentUserName || "Anonymous",
            fallback: status,
            text: text.trim(),
            title_link: window.location.href,
          },
        ],
      };

      sendToServer(payload)
        .then((response) => {
          if (!response.ok) {
            throw new Error("Feedback request failed");
          }

          addAlert(AlertCodes.feedbackSendSuccessful);
          setText("");
          setIsOpen(false);
        })
        .catch(() => {
          addAlert(AlertCodes.feedbackSendError);
        })
        .finally(() => {
          setIsSubmitting(false);
        });
    },
    [addAlert, currentUserName, status, text],
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="btn btn-sm btn-secondary cb-btn-secondary cb-rounded d-flex align-items-center"
        style={{
          position: "fixed",
          right: "16px",
          bottom: "16px",
          zIndex: 1080,
          gap: "8px",
        }}
      >
        <FontAwesomeIcon icon={["fas", "rss"]} />
        {i18n.t("Feedback")}
      </button>
      {isOpen && (
        <Modal centered show={isOpen} onHide={closeModal} contentClassName="cb-bg-panel cb-text">
          <form onSubmit={onSubmit}>
            <Modal.Header className="cb-border-color" closeButton>
              <Modal.Title>{i18n.t("Send feedback")}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <div className="form-group">
                <label htmlFor="feedback-status">{i18n.t("Type")}</label>
                <div
                  id="feedback-status"
                  className="d-flex flex-wrap"
                  role="radiogroup"
                  aria-label={i18n.t("Type")}
                >
                  {STATUS_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`btn btn-sm cb-rounded mr-2 mb-2 ${
                        status === option
                          ? "btn-secondary cb-btn-secondary"
                          : "btn-outline-secondary cb-btn-outline-secondary"
                      }`}
                      role="radio"
                      aria-checked={status === option}
                      onClick={() => setStatus(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group mb-0">
                <label htmlFor="feedback-text">{i18n.t("Message")}</label>
                <textarea
                  id="feedback-text"
                  className="form-control cb-bg-panel cb-border-color text-white cb-rounded"
                  rows="5"
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  required
                />
              </div>
            </Modal.Body>
            <Modal.Footer className="cb-border-color">
              <Button
                type="button"
                className="btn btn-secondary cb-btn-secondary cb-rounded"
                onClick={closeModal}
                disabled={isSubmitting}
              >
                {i18n.t("Cancel")}
              </Button>
              <Button
                type="submit"
                className="btn btn-secondary cb-btn-secondary cb-rounded"
                disabled={isSubmitDisabled}
              >
                {isSubmitting ? i18n.t("Sending...") : i18n.t("Send")}
              </Button>
            </Modal.Footer>
          </form>
        </Modal>
      )}
    </>
  );
}

export default memo(FeedbackWidget);
