import React from "react";

import CustomFooter from "./CustomFooter";

import type * as TDrawboard from "@drawboard/drawboard";
import type { DrawboardImperativeAPI } from "@drawboard/drawboard/types";

const MobileFooter = ({
  drawboardAPI,
  drawboardLib,
}: {
  drawboardAPI: DrawboardImperativeAPI;
  drawboardLib: typeof TDrawboard;
}) => {
  const { useEditorInterface, Footer } = drawboardLib;

  const editorInterface = useEditorInterface();
  if (editorInterface.formFactor === "phone") {
    return (
      <Footer>
        <CustomFooter drawboardAPI={drawboardAPI} drawboardLib={drawboardLib} />
      </Footer>
    );
  }
  return null;
};
export default MobileFooter;
