import { Footer } from "@drawboard/drawboard/index";
import React from "react";

import { useAtomValue } from "../app-jotai";
import { saveStatusAtom } from "../app-jotai";

import { DebugFooter, isVisualDebuggerEnabled } from "./DebugCanvas";
import { EncryptedIcon } from "./EncryptedIcon";

const SaveIndicator = React.memo(() => {
  const status = useAtomValue(saveStatusAtom);

  if (status === "idle") {
    return null;
  }

  const label =
    status === "saving"
      ? "Saving…"
      : status === "saved"
      ? "Saved"
      : "Save failed";

  const color =
    status === "saving"
      ? "var(--color-on-surface)"
      : status === "saved"
      ? "var(--color-success)"
      : "var(--color-danger)";

  return (
    <span
      style={{
        fontSize: "0.75rem",
        color,
        opacity: status === "saved" ? 0.75 : 1,
        userSelect: "none",
      }}
    >
      {label}
    </span>
  );
});

export const AppFooter = React.memo(
  ({ onChange }: { onChange: () => void }) => {
    return (
      <Footer>
        <div
          style={{
            display: "flex",
            gap: ".5rem",
            alignItems: "center",
          }}
        >
          {isVisualDebuggerEnabled() && <DebugFooter onChange={onChange} />}
          <SaveIndicator />
          <EncryptedIcon />
        </div>
      </Footer>
    );
  },
);
