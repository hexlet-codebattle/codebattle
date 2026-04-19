import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import i18n from "../../../i18n";
import Header from "./Header";
import EvolutionPanel from "./EvolutionPanel";
import MainPanel from "./MainPanel";
import EditorPanel from "./EditorPanel";
import LogPanel from "./LogPanel";
import useGroupTournamentChannel from "@/utils/useGroupTournamentChannel";
import * as selectors from "../../selectors";
import Loading from "@/components/Loading";
import { load, requestInviteUpdate } from "@/middlewares/GroupTournament";
import AdminExternalSetupPanel from "./AdminExternalSetupPanel";

const getDateTimestamp = (value) => {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value).getTime();

  return Number.isNaN(timestamp) ? null : timestamp;
};

const findSolutionForRun = (run, solutionHistory) => {
  if (!run || !solutionHistory?.length) {
    return null;
  }

  const solutionWithSameId = solutionHistory.find((solution) => solution.id === run.id);

  if (solutionWithSameId) {
    return solutionWithSameId;
  }

  const runInsertedAtTimestamp = getDateTimestamp(run.insertedAt);

  if (runInsertedAtTimestamp === null) {
    return solutionHistory[0] || null;
  }

  return (
    solutionHistory.find((solution) => {
      const solutionInsertedAtTimestamp = getDateTimestamp(solution.insertedAt);

      return (
        solutionInsertedAtTimestamp !== null &&
        solutionInsertedAtTimestamp <= runInsertedAtTimestamp
      );
    }) ||
    solutionHistory[solutionHistory.length - 1] ||
    null
  );
};

function GroupTournamentPage({ tournamentId, tournamentName, tournamentDescription }) {
  const dispatch = useDispatch();

  const [viewerFullscreen, setViewerFullscreen] = useState(false);
  const [selectedRun, setSelectedRun] = useState();
  const [runId, setRunId] = useState();

  useGroupTournamentChannel(tournamentId);

  const {
    status,
    projectStatus,
    projectLink,
    invite,
    externalSetup,
    solutionEvolution,
    requireInvitation,
    platformError,
    logs,
    code,
    langSlug,
    data,
  } = useSelector(selectors.groupTournamentSelector);

  const isAdmin = useSelector(selectors.currentUserIsAdminSelector);

  const solutionHistory = useMemo(() => data?.solutionHistory || [], [data?.solutionHistory]);
  const selectedRunSolution = useMemo(
    () => findSolutionForRun(selectedRun, solutionHistory),
    [selectedRun, solutionHistory],
  );
  const editorText = selectedRunSolution?.solution || code;
  const editorLang = selectedRunSolution?.lang || langSlug;

  const requestInviteUpdates = () => {
    requestInviteUpdate()(dispatch);
  };

  useEffect(() => {
    if (runId && data.runs) {
      const r = data.runs.find((run) => run.id === runId);
      setSelectedRun(r || data.runs[0]);
    }
  }, [runId, data.runs]);

  useEffect(() => {
    if (tournamentId) {
      load(tournamentId)(dispatch);
    }
  }, [tournamentId, dispatch]);

  if (status === "loading") {
    return <Loading />;
  }

  if (!isAdmin && requireInvitation && invite.state !== "accepted") {
    const isPending =
      invite.state === "creating" || invite.state === "pending" || invite.state === "loading";
    const isFailed = invite.state === "failed";

    return (
      <div className="container-fluid h-100">
        <div className="row justify-content-center h-100">
          <div className="col-lg-5 col-md-6 col-sm-8 px-md-4 align-content-center">
            <div className="cb-bg-panel shadow-sm cb-rounded p-5">
              <p className="text-center cb-text mb-4">
                {i18n.t("You need to accept an invitation to participate in this tournament.")}
              </p>
              {isPending && !invite.inviteLink && (
                <div className="text-center cb-text mb-3">{i18n.t("Preparing your invite...")}</div>
              )}
              {isFailed && (
                <div className="text-center text-danger mb-3">
                  {i18n.t("Invite failed. Please try again.")}
                </div>
              )}
              <div className="d-flex flex-column align-items-center gap-3">
                {invite.inviteLink && (
                  <a
                    href={invite.inviteLink}
                    className="btn btn-lg btn-success cb-rounded w-100"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {i18n.t("Accept Invite")}
                  </a>
                )}
                {isFailed ? (
                  <button
                    type="button"
                    className="btn btn-outline-secondary cb-btn-outline-secondary cb-rounded w-100"
                    onClick={requestInviteUpdates}
                  >
                    {i18n.t("Retry")}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-outline-secondary cb-btn-outline-secondary cb-rounded w-100"
                    onClick={requestInviteUpdates}
                  >
                    {i18n.t("Check Status")}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (platformError) {
    return (
      <div className="container-fluid h-100">
        <div className="row justify-content-center h-100">
          <div className="col-lg-5 col-md-6 col-sm-8 px-md-4 align-content-center">
            <div className="cb-bg-panel shadow-sm cb-rounded p-5">
              <div className="text-center text-danger mb-3">
                {i18n.t(
                  "Could not retrieve your external platform credentials. Please contact support.",
                )}
              </div>
              <div className="d-flex justify-content-center">
                <button
                  type="button"
                  className="btn btn-outline-secondary cb-btn-outline-secondary cb-rounded"
                  onClick={requestInviteUpdates}
                >
                  {i18n.t("Retry")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="row">
        <Header name={tournamentName} status={status} />
      </div>
      {isAdmin && externalSetup && (
        <div className="row mt-2">
          <AdminExternalSetupPanel externalSetup={externalSetup} />
        </div>
      )}
      <div className="row mt-3 h-100">
        <div className="col-lg-3 col-md-3 col-12 p-1 pb-4">
          <EvolutionPanel
            items={data?.runs}
            tournamentStatus={status}
            runId={runId}
            setRunId={setRunId}
            repoUrl={externalSetup?.repoUrl}
          />
        </div>
        <div className="col-lg-5 col-md-5 col-12 p-1 pb-4">
          <MainPanel
            status={status}
            run={selectedRun}
            description={tournamentDescription}
            setViewerFullscreen={setViewerFullscreen}
          />
        </div>
        <div className="col-lg-4 col-md-4 col-12 p-1 pb-4">
          <EditorPanel text={editorText} lang={editorLang} />
          <LogPanel logs={logs} />
        </div>
      </div>
      {viewerFullscreen && selectedRun?.result?.viewerHtml ? (
        <div
          className="position-fixed d-flex flex-column"
          style={{
            inset: 0,
            zIndex: 2000,
            backgroundColor: "rgba(15, 23, 42, 0.96)",
            padding: "16px",
          }}
        >
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="text-white">
              {i18n.t("Run Viewer Fullscreen")}
              {selectedRun ? ` • Run #${selectedRun.id}` : ""}
            </div>
            <button
              type="button"
              className="btn btn-outline-light cb-rounded"
              onClick={() => setViewerFullscreen(false)}
            >
              {i18n.t("Close Fullscreen")}
            </button>
          </div>
          <div className="flex-grow-1">
            <iframe
              title={`run-viewer-fullscreen-${selectedRun.id}`}
              srcDoc={selectedRun.result.viewerHtml}
              sandbox="allow-scripts"
              style={{
                width: "100%",
                height: "100%",
                border: 0,
                backgroundColor: "#fff",
                borderRadius: "8px",
              }}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}

export default GroupTournamentPage;
