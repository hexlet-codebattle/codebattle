import React from "react";

const Message = ({ text = "", name = "", type }) => {
  if (!text) {
    return null;
  }

  console.log( text, name, type)
  if (type === "info") {
    return (
      <small className="text-muted text-small">
        {text}
      </small>
    );
  }

  const parts = text.split(/(@+[-a-zA-Z0-9_]+\b)/g);

  const renderMessagePart = (part, i) => {
    if (part.slice(1) === name) {
      return (
        <span key={i} className="font-weight-bold bg-warning">
          {part}
        </span>
      );
    }
    if (part.startsWith("@")) {
      return (
        <span key={i} className="font-weight-bold text-primary">
          {part}
        </span>
      );
    }
    return part;
  };

  return (
    <div>
      {/* eslint-disable-next-line react/no-array-index-key */}
      <span className="font-weight-bold">{`${name}: `}</span>
      <span>{parts.map((part, i) => renderMessagePart(part, i))}</span>
    </div>
  );
};

export default Message;
