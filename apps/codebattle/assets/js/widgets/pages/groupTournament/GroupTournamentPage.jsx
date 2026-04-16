import React, { useEffect, useMemo, useState } from "react";
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

function GroupTournamentPage() {
  const dispatch = useDispatch();

  const [showInviteWindow, setShowInviteWindow] = useState(false);
  const [runId, setRunId] = useState();

  useGroupTournamentChannel();

  const {
    status,
    projectStatus,
    projectLink,
    invite,
    solutionEvolution,
    logs,
    code,
    langSlug,
  } = useSelector(selectors.groupTournamentSelector);

  const openExternalRegistrationWindow = () => {
    setShowInviteWindow(true);
  }

  const requestInviteUpdates = () => {
    requestInviteUpdate()(dispatch);
  }

  useEffect(() => {
    if (runId) {
      console.log(runId);
    }
  }, [runId])

  useEffect(() => {
    if (showInviteWindow) {
      open(invite.inviteLink, undefined, "left=100,top=100,width=960,height=640");
    }
  }, [showInviteWindow])

  if (invite.status === "loading") {
    return <Loading />;
  }

  if (invite.status === "creating" || invite.status === "pending") {
    return <>
      <div className="container-fluid h-100">
        <div className="row justify-content-center h-100">
          <div className="col-lg-5 col-md-5 col-sm-5 px-md-4 align-content-center">
            <div className="card cb-card border cb-border-color cb-rounded shadow-sm p-5">
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
              <small className="text-center mt-3">For this stage you need registrated on a new platform</small>
            </div>
          </div>
        </div>
      </div>
    </>
  }

  return (
    <>
      <div className="container-fluid">
        <div className="row">
          <div className="col-12">
            <Header />
          </div>
        </div>
        <div className="row mt-1">
          <div className="col-lg-3 col-md-3 col-12">
            <EvolutionPanel items={solutionEvolution} tournamentStatus={status} setRunId={setRunId} />
          </div>
          <div className="col-lg-6 col-md-6 col-12">
            <MainPanel status={status} />
          </div>
          <div className="col-lg-3 col-md-3 col-12">
            <EditorPanel text={code} lang={langSlug} />
            <LogPanel logs={logs} className="mt-1" />
          </div>
        </div>
      </div>
    </>
  );
}

export default GroupTournamentPage;
