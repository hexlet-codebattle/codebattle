import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import Header from "./Header";
import EvolutionPanel from "./EvolutionPanel";
import MainPanel from "./MainPanel";
import EditorPanel from "./EditorPanel";
import LogPanel from "./LogPanel";
import useGroupTournamentChannel from "@/utils/useGroupTournamentChannel";
import * as selectors from "../../selectors";
import Loading from "@/components/Loading";
import { load, requestInviteUpdate } from "@/middlewares/GroupTournament";

function GroupTournamentPage({ tournamentId, tournamentName, tournamentDescription }) {
  const dispatch = useDispatch();

  const [viewerFullscreen, setViewerFullscreen] = useState(false);
  const [showInviteWindow, setShowInviteWindow] = useState(false);
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
    logs,
    code,
    langSlug,
    data,
  } = useSelector(selectors.groupTournamentSelector);

  const openExternalRegistrationWindow = () => {
    setShowInviteWindow(true);
  };

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
    if (showInviteWindow) {
      open(invite.inviteLink, undefined, "left=100,top=100,width=960,height=640");
    }
  }, [invite.inviteLink, showInviteWindow]);

  useEffect(() => {
    if (tournamentId) {
      load(tournamentId)(dispatch);
    }
  }, [tournamentId, dispatch])

  if (invite.state === "loading" && requireInvitation) {
    return <Loading />;
  }

  if ((invite.state === "creating" || invite.state === "pending") && requireInvitation) {
    return (
      <div className="container-fluid h-100">
        <div className="row justify-content-center h-100">
          <div className="col-lg-5 col-md-6 col-sm-8 px-md-4 align-content-center">
            <div className="cb-bg-panel shadow-sm cb-rounded p-5">
              {tournamentName && <h5 className="text-center mb-4">{tournamentName}</h5>}
              <div className="d-flex">
                <button
                  type="button"
                  className="btn btn-success text-white cb-rounded w-100"
                  onClick={openExternalRegistrationWindow}
                >
                  Registration
                </button>
                <button
                  type="button"
                  className="btn btn-secondary cb-rounded w-100 ml-2"
                  onClick={requestInviteUpdates}
                >
                  Next Step
                </button>
              </div>
              <small className="text-center d-block mt-3">
                For this stage you need to register on the external platform
              </small>
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
            externalSetup={externalSetup}
            description={tournamentDescription}
            setViewerFullscreen={setViewerFullscreen}
          />
        </div>
        <div className="col-lg-4 col-md-4 col-12 p-1 pb-4">
          <EditorPanel text={code} lang={langSlug} />
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
              Run Viewer Fullscreen{selectedRun ? ` • Run #${selectedRun.id}` : ""}
            </div>
            <button
              type="button"
              className="btn btn-outline-light cb-rounded"
              onClick={() => setViewerFullscreen(false)}
            >
              Close Fullscreen
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
