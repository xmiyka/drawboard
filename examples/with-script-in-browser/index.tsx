import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@drawboard/drawboard/index.css";

import App from "./components/ExampleApp";

import type * as TDrawboard from "@drawboard/drawboard";

declare global {
  interface Window {
    DrawboardLib: typeof TDrawboard;
  }
}

const rootElement = document.getElementById("root")!;
const root = createRoot(rootElement);
const { Drawboard } = window.DrawboardLib;
root.render(
  <StrictMode>
    <App
      appTitle={"Drawboard Example"}
      useCustom={(api: any, args?: any[]) => {}}
      drawboardLib={window.DrawboardLib}
    >
      <Drawboard />
    </App>
  </StrictMode>,
);
