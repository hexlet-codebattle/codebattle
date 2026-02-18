import React from "react";
import "./Header.css";

export default function Header({ onSave }) {
  return (
    <div className="app-header">
      <h1 className="header-title">CodeBattle Broadcast Editor</h1>
      <div className="header-buttons">
        <button type="button" onClick={onSave}>
          Add preset
        </button>
      </div>
    </div>
  );
}
