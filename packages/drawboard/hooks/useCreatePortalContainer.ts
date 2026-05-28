import { useState, useLayoutEffect } from "react";

import { THEME } from "@drawboard/common";

import { useEditorInterface, useDrawboardContainer } from "../components/App";
import { useUIAppState } from "../context/ui-appState";

export const useCreatePortalContainer = (opts?: {
  className?: string;
  parentSelector?: string;
}) => {
  const [div, setDiv] = useState<HTMLDivElement | null>(null);

  const editorInterface = useEditorInterface();
  const { theme } = useUIAppState();

  const { container: drawboardContainer } = useDrawboardContainer();

  useLayoutEffect(() => {
    if (div) {
      div.className = "";
      div.classList.add("drawboard", ...(opts?.className?.split(/\s+/) || []));
      div.classList.toggle(
        "drawboard--mobile",
        editorInterface.formFactor === "phone",
      );
      div.classList.toggle("theme--dark", theme === THEME.DARK);
    }
  }, [div, theme, editorInterface.formFactor, opts?.className]);

  useLayoutEffect(() => {
    const container = opts?.parentSelector
      ? drawboardContainer?.querySelector(opts.parentSelector)
      : document.body;

    if (!container) {
      return;
    }

    const div = document.createElement("div");

    container.appendChild(div);

    setDiv(div);

    return () => {
      container.removeChild(div);
    };
  }, [drawboardContainer, opts?.parentSelector]);

  return div;
};
