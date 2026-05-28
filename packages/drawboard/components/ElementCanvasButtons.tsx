import { sceneCoordsToViewportCoords } from "@drawboard/common";
import { getElementAbsoluteCoords } from "@drawboard/element";

import { useDrawboardAppState } from "../components/App";

import "./ElementCanvasButtons.scss";

import type {
  ElementsMap,
  NonDeletedDrawboardElement,
} from "@drawboard/element/types";
import type { AppState } from "../types";

const CONTAINER_PADDING = 5;

const getContainerCoords = (
  element: NonDeletedDrawboardElement,
  appState: AppState,
  elementsMap: ElementsMap,
) => {
  const [x1, y1] = getElementAbsoluteCoords(element, elementsMap);
  const { x: viewportX, y: viewportY } = sceneCoordsToViewportCoords(
    { sceneX: x1 + element.width, sceneY: y1 },
    appState,
  );
  const x = viewportX - appState.offsetLeft + 10;
  const y = viewportY - appState.offsetTop;
  return { x, y };
};

export const ElementCanvasButtons = ({
  children,
  element,
  elementsMap,
}: {
  children: React.ReactNode;
  element: NonDeletedDrawboardElement;
  elementsMap: ElementsMap;
}) => {
  const appState = useDrawboardAppState();

  if (
    appState.contextMenu ||
    appState.newElement ||
    appState.resizingElement ||
    appState.isRotating ||
    appState.openMenu ||
    appState.viewModeEnabled
  ) {
    return null;
  }

  const { x, y } = getContainerCoords(element, appState, elementsMap);

  return (
    <div
      className="drawboard-canvas-buttons"
      style={{
        top: `${y}px`,
        left: `${x}px`,
        // width: CONTAINER_WIDTH,
        padding: CONTAINER_PADDING,
      }}
    >
      {children}
    </div>
  );
};
