import React from "react";
import { createRoot } from "react-dom/client";
import GameView from "./views/Game";
import "./index.css";
import * as serviceWorker from "./serviceWorker";

const container = document.getElementById("root");
const root = createRoot(container!);
root.render(<GameView />);

// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.register();
