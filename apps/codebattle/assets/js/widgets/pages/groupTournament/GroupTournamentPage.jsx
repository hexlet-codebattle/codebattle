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
import { requestInviteUpdate } from "@/middlewares/GroupTournament";

function GroupTournamentPage({ tournamentId, tournamentName, tournamentDescription }) {
  const dispatch = useDispatch();

  const [showInviteWindow, setShowInviteWindow] = useState(false);
  const [runId, setRunId] = useState();

  useGroupTournamentChannel(tournamentId);

  const {
    status,
    projectStatus,
    projectLink,
    invite,
    externalSetup,
    solutionEvolution,
    logs,
    code,
    langSlug,
  } = useSelector(selectors.groupTournamentSelector);

  const openExternalRegistrationWindow = () => {
    setShowInviteWindow(true);
  };

  const requestInviteUpdates = () => {
    requestInviteUpdate()(dispatch);
  };

  useEffect(() => {
    if (runId) {
      console.log(runId);
    }
  }, [runId]);

  useEffect(() => {
    if (showInviteWindow) {
      open(invite.inviteLink, undefined, "left=100,top=100,width=960,height=640");
    }
  }, [invite.inviteLink, showInviteWindow]);

  if (invite.state === "loading") {
    return <Loading />;
  }

  if (invite.state === "creating" || invite.state === "pending") {
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
    <div className="container-fluid py-3">
      <div className="row">
        <div className="col-12">
          <Header name={tournamentName} status={status} />
        </div>
      </div>
      <div className="row mt-3">
        <div className="col-lg-3 col-md-4 col-12 mb-3 mb-md-0">
          <EvolutionPanel items={solutionEvolution} tournamentStatus={status} setRunId={setRunId} />
        </div>
        <div className="col-lg-6 col-md-4 col-12 mb-3 mb-md-0">
          <MainPanel
            status={status}
            externalSetup={externalSetup}
            description={tournamentDescription}
          />
        </div>
        <div className="col-lg-3 col-md-4 col-12">
          <EditorPanel text={code} lang={langSlug} />
          <LogPanel logs={logs} className="mt-3" />
        </div>
      </div>
    </div>
  );
}

export default GroupTournamentPage;
