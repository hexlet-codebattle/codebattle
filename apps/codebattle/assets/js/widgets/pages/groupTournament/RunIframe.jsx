import React, { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { currentUserIdSelector } from "../../selectors";

function RunIframe(props) {
  const iframeRef = useRef(null);
  const currentUserId = useSelector(currentUserIdSelector);

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

  return <iframe ref={iframeRef} {...props} />;
}

export default RunIframe;
