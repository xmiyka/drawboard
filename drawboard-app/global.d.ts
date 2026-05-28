import "@drawboard/drawboard/global";
import "@drawboard/drawboard/css";

interface Window {
  __DRAWBOARD_SHA__: string | undefined;
}

declare module "@shoojs/react";
