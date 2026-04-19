import React, { useCallback, useMemo, useState, memo, useContext } from "react";

import cn from "classnames";
import Button from "react-bootstrap/Button";
import moment from "moment";

import Modal from "@/components/BootstrapModal";

import CustomEventStylesContext from "../../components/CustomEventStylesContext";

const formatValue = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : null;
  }

  return String(value);
};

const formatDate = (value) => {
  if (!value) {
    return null;
  }

  return moment.utc(value).format("YYYY-MM-DD HH:mm:ss [UTC]");
};

function DetailSection({ title, items }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="cb-bg-highlight-panel cb-rounded p-3 h-100">
      <div className="small text-uppercase text-muted font-weight-bold mb-3">{title}</div>
      <div className="row mx-n2">
        {items.map(({ label, value }) => (
          <div key={label} className="col-12 col-sm-6 px-2 mb-3">
            <div className="small text-muted mb-1">{label}</div>
            <div className="font-weight-bold text-break">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RawJsonSection({ tournament }) {
  const json = useMemo(() => {
    const { matches, ranking, players, ...rest } = tournament;
    return JSON.stringify(rest, null, 2);
  }, [tournament]);

  return (
    <pre
      className="cb-bg-highlight-panel cb-rounded p-3 mb-0 small cb-text"
      style={{ maxHeight: 400, overflow: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word" }}
    >
      {json}
    </pre>
  );
}

function DetailsModal({ tournament, modalShowing, setModalShowing }) {
  const hasCustomEventStyles = useContext(CustomEventStylesContext);
  const [showRawJson, setShowRawJson] = useState(false);

  const closeBtnClassName = cn("btn rounded-lg", {
    "btn-secondary": !hasCustomEventStyles,
    "cb-custome-event-btn-secondary": !hasCustomEventStyles,
  });

  const detailSections = useMemo(() => {
    const sections = [
      {
        title: "Overview",
        items: [
          { label: "Name", value: formatValue(tournament.name) },
          { label: "State", value: formatValue(tournament.state) },
          { label: "Type", value: formatValue(tournament.type) },
          { label: "Level", value: formatValue(tournament.level) },
          { label: "Access", value: formatValue(tournament.accessType) },
          { label: "Ranking type", value: formatValue(tournament.rankingType) },
        ],
      },
      {
        title: "Schedule",
        items: [
          { label: "Starts at", value: formatDate(tournament.startsAt) },
          { label: "Created at", value: formatDate(tournament.insertedAt) },
          { label: "Updated at", value: formatDate(tournament.updatedAt) },
          { label: "Rounds limit", value: formatValue(tournament.roundsLimit) },
          { label: "Current round", value: formatValue(tournament.currentRoundPosition) },
        ],
      },
      {
        title: "Timeouts",
        items: [
          { label: "Timeout mode", value: formatValue(tournament.timeoutMode) },
          {
            label: "Round timeout",
            value: formatValue(tournament.roundTimeoutSeconds),
          },
          {
            label: "Current round timeout",
            value: formatValue(tournament.currentRoundTimeoutSeconds),
          },
          {
            label: "Tournament timeout",
            value: formatValue(tournament.tournamentTimeoutSeconds),
          },
          {
            label: "Break duration",
            value: formatValue(tournament.breakDurationSeconds),
          },
        ],
      },
      {
        title: "Participants",
        items: [
          { label: "Players", value: formatValue(tournament.playersCount) },
          { label: "Players limit", value: formatValue(tournament.playersLimit) },
          { label: "Bots visible", value: formatValue(tournament.showBots) },
          { label: "Chat enabled", value: formatValue(tournament.useChat) },
          { label: "Clan mode", value: formatValue(tournament.useClan) },
          { label: "Live", value: formatValue(tournament.isLive) },
        ],
      },
      {
        title: "Task",
        items: [
          { label: "Task provider", value: formatValue(tournament.taskProvider) },
          { label: "Task pack", value: formatValue(tournament.taskPackName) },
          { label: "Task strategy", value: formatValue(tournament.taskStrategy) },
          { label: "Event ID", value: formatValue(tournament.eventId) },
          { label: "Tournament ID", value: formatValue(tournament.id) },
        ],
      },
    ];

    return sections.map(({ title, items }) => ({
      title,
      items: items.filter(({ value }) => value !== null),
    }));
  }, [tournament]);

  const handleCancel = useCallback(() => setModalShowing(false), [setModalShowing]);

  return (
    <Modal contentClassName="cb-bg-panel cb-text" show={modalShowing} onHide={handleCancel}>
      <Modal.Header className="cb-border-color" closeButton>
        <Modal.Title>Tournament details</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {tournament.description ? (
          <div className="cb-bg-highlight-panel cb-rounded p-3 mb-3">
            <div className="small text-uppercase text-muted font-weight-bold mb-2">Description</div>
            <div className="mb-0 text-break">{tournament.description}</div>
          </div>
        ) : null}
        <div className="row mx-n2">
          {detailSections.map(({ title, items }) => (
            <div key={title} className="col-12 col-lg-6 px-2 mb-3">
              <DetailSection title={title} items={items} />
            </div>
          ))}
        </div>
        {showRawJson && <RawJsonSection tournament={tournament} />}
      </Modal.Body>
      <Modal.Footer className="cb-border-color d-flex justify-content-between">
        <Button
          variant="outline-secondary"
          size="sm"
          className="rounded-lg"
          onClick={() => setShowRawJson((v) => !v)}
        >
          {showRawJson ? "Hide JSON" : "Raw JSON"}
        </Button>
        <Button onClick={handleCancel} className={closeBtnClassName}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default memo(DetailsModal);
