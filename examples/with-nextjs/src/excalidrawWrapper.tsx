"use client";
import * as drawboardLib from "@drawboard/drawboard";
import { Drawboard } from "@drawboard/drawboard";

import "@drawboard/drawboard/index.css";

import App from "../../with-script-in-browser/components/ExampleApp";

const DrawboardWrapper: React.FC = () => {
  return (
    <>
      <App
        appTitle={"Drawboard with Nextjs Example"}
        useCustom={(api: any, args?: any[]) => {}}
        drawboardLib={drawboardLib}
      >
        <Drawboard />
      </App>
    </>
  );
};

export default DrawboardWrapper;
