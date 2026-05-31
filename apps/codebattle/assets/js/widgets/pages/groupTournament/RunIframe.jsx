import React, { useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { currentUserIdSelector, groupTournamentSelector } from "../../selectors";
import { actions } from "../../slices";

function RunIframe({ title = "Run Viewer", ...props }) {
  const iframeRef = useRef(null);
  const dispatch = useDispatch();
  const currentUserId = useSelector(currentUserIdSelector);
  const { data } = useSelector(groupTournamentSelector);
  const runs = data?.runs;
  const runsRef = useRef(runs);

  useEffect(() => {
    runsRef.current = runs;
  }, [runs]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (iframe && currentUserId) {
      const handleLoad = () => {
        iframe.contentWindow.postMessage({ type: "set_current_user_id", currentUserId }, "*");
      };

      iframe.addEventListener("load", handleLoad);
      // Also try to send it immediately in case it's already loaded
      iframe.contentWindow.postMessage({ type: "set_current_user_id", currentUserId }, "*");

      return () => {
        iframe.removeEventListener("load", handleLoad);
      };
    }

    return undefined;
  }, [currentUserId]);

  useEffect(() => {
    const handleMessage = (event) => {
      if (
        event.data &&
        typeof event.data === "object" &&
        event.data.type === "set_current_user_id_result"
      ) {
        const { place, runId } = event.data;
        const hasRun = (runsRef.current || []).some((run) => run.id === runId);

        if (hasRun) {
          dispatch(actions.updateRun({ runId, place }));
        }
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [dispatch]);

  return <iframe ref={iframeRef} title={title} {...props} />;
}

export default RunIframe;
