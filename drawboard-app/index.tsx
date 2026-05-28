import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { ConvexProviderWithAuth } from "convex/react";

import "../drawboard-app/sentry";

import DrawboardApp from "./App";
import { getConvexClient } from "./data/firebaseApp";
import { ShooCallbackHandler, useAuth } from "./shoo";

window.__DRAWBOARD_SHA__ = import.meta.env.VITE_APP_GIT_SHA;
const rootElement = document.getElementById("root")!;
const root = createRoot(rootElement);
registerSW();
const convexClient = getConvexClient();
root.render(
  <StrictMode>
    <ShooCallbackHandler />
    {convexClient ? (
      <ConvexProviderWithAuth client={convexClient} useAuth={useAuth}>
        <DrawboardApp />
      </ConvexProviderWithAuth>
    ) : (
      <DrawboardApp />
    )}
  </StrictMode>,
);
