import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export function copyStyles(sourceDoc, targetDoc) {
  Array.from(sourceDoc.styleSheets).forEach((styleSheet) => {
    try {
      if (styleSheet.cssRules) {
        // Inline styles or same-origin stylesheets
        const newStyleEl = targetDoc.createElement("style");
        for (const rule of styleSheet.cssRules) {
          newStyleEl.appendChild(targetDoc.createTextNode(rule.cssText));
        }
        targetDoc.head.appendChild(newStyleEl);
      } else if (styleSheet.href) {
        // External stylesheets
        const newLinkEl = targetDoc.createElement("link");
        newLinkEl.rel = "stylesheet";
        newLinkEl.href = styleSheet.href;
        targetDoc.head.appendChild(newLinkEl);
      }
    } catch (e) {
      // Fallback for CORS-protected stylesheets
      if (styleSheet.href) {
        const newLinkEl = targetDoc.createElement("link");
        newLinkEl.rel = "stylesheet";
        newLinkEl.href = styleSheet.href;
        targetDoc.head.appendChild(newLinkEl);
      }
    }
  });
}

const PictureInPicture = ({
  isActive,
  onClose,
  children,
  width = 300,
  height = 150,
}) => {
  const [container, setContainer] = useState(null);
  const pipWindowRef = useRef(null);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const startPip = async () => {
      if (typeof window === "undefined" || !window.documentPictureInPicture) {
        console.warn("Document Picture-in-Picture API is not supported in this browser.");
        onClose();
        return;
      }

      if (pipWindowRef.current) return;

      try {
        const pw = await window.documentPictureInPicture.requestWindow({
          width,
          height,
        });

        // Setup base styles to avoid white flash or weird scrollbars
        pw.document.body.style.backgroundColor = "#151515";
        pw.document.body.style.margin = "0";
        pw.document.body.style.display = "flex";
        pw.document.body.style.flexDirection = "column";
        pw.document.body.style.height = "100vh";
        pw.document.body.style.justifyContent = "center";
        pw.document.body.style.alignItems = "center";
        pw.document.body.style.overflow = "hidden";

        // Copy parent styles
        copyStyles(document, pw.document);

        const pipContainer = pw.document.createElement("div");
        pipContainer.id = "pip-root";
        pipContainer.className = "w-100 h-100 d-flex flex-column align-items-center justify-content-center";
        pw.document.body.appendChild(pipContainer);

        pw.addEventListener("pagehide", () => {
          pipWindowRef.current = null;
          setContainer(null);
          onClose();
        });

        pipWindowRef.current = pw;
        setContainer(pipContainer);
      } catch (err) {
        console.error("Failed to open Document PiP window:", err);
        onClose();
      }
    };

    startPip();

    return () => {
      if (pipWindowRef.current) {
        pipWindowRef.current.close();
        pipWindowRef.current = null;
      }
      setContainer(null);
    };
  }, [isActive, onClose, width, height]);

  if (!isActive || !container) {
    return null;
  }

  return createPortal(children, container);
};

export default PictureInPicture;
