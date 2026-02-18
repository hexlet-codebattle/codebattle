import React from "react";

import cn from "classnames";

import useHover from "../utils/useHover";

import InfoMessage from "./InfoMessage";
import MessageTag from "./MessageTag";
import MessageTimestamp from "./MessageTimestamp";
import SystemMessage from "./SystemMessage";

function MessageHeader({ name, time, hovered }) {
  const playerClassName = cn(
    "d-inline-block text-truncate align-top text-nowrap cb-username-max-length mr-1",
    { "text-primary": hovered },
  );

  return (
    <>
      <span className="font-weight-bold">
        <span className={playerClassName}>{name}</span>
      </span>
      <MessageTimestamp time={time} />
    </>
  );
}

function MessagePart({ part, index, name }) {
  if (part.slice(1) === name) {
    return (
      <span key={index} className="font-weight-bold bg-warning">
        {part}
      </span>
    );
  }

  if (part.startsWith("@")) {
    return (
      <span key={index} className="font-weight-bold text-primary">
        {part}
      </span>
    );
  }

  return part;
}

function Message({ text = "", name = "", userId, type, time, meta, displayMenu }) {
  const [chatHeaderRef, hoveredChatHeader] = useHover();

  if (!text) {
    return null;
  }

  if (type === "system") {
    return <SystemMessage text={text} meta={meta} />;
  }

  if (type === "info") {
    return <InfoMessage text={text} time={time} />;
  }

  const parts = text.split(/(@+[-a-zA-Z0-9_]+\b)/g);

  const textPartsClassNames = cn("text-break", {
    "cb-private-text": meta?.type === "private",
  });

  return (
    <div className="d-flex align-items-baseline flex-wrap mb-1">
      <span className="d-flex flex-column w-100">
        <span
          ref={chatHeaderRef}
          role="button"
          tabIndex={0}
          title={`Message (${name})`}
          className="d-flex justify-content-between"
          data-user-id={userId}
          data-user-name={name}
          onContextMenu={displayMenu}
          onClick={displayMenu}
          onKeyPress={displayMenu}
        >
          <MessageHeader name={name} time={time} hovered={hoveredChatHeader} />
        </span>
        <span>
          <MessageTag messageType={meta?.type} />
          <span className={textPartsClassNames}>
            {parts.map((part, i) => (
              /* eslint-disable react/no-array-index-key */
              <MessagePart key={i} part={part} index={i} name={name} />
            ))}
          </span>
        </span>
      </span>
    </div>
  );
}

export default Message;
