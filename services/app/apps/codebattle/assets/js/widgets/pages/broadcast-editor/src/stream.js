import React from "react";
import { createRoot } from "react-dom/client";
import AppStream from "./AppStream";
import "./index.css";
import "./components/BlockBase/BlockBase.css"
import "./components/BlockCode/BlockCode.css"
import "./components/BlockText/BlockText.css"
import "./components/BlockTimer/BlockTimer.css"
import "./components/Canvas/Canvas.css"
import "./components/ContextMenu/ContextMenu.css"
import "./components/Header/Header.css"
import "./components/Toast/Toast.css"
import "./components/resize.css"

const container = document.getElementById("stream-root");
const root = createRoot(container);
root.render(<AppStream/>);