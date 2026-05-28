import { VERSIONS } from "@drawboard/common";

import {
  diamondFixture,
  ellipseFixture,
  rectangleFixture,
} from "./elementFixture";

export const diagramFixture = {
  type: "drawboard",
  version: VERSIONS.drawboard,
  source: "https://drawboard.com",
  elements: [diamondFixture, ellipseFixture, rectangleFixture],
  appState: {
    viewBackgroundColor: "#ffffff",
    gridModeEnabled: false,
  },
  files: {},
};

export const diagramFactory = ({
  overrides = {},
  elementOverrides = {},
} = {}) => ({
  ...diagramFixture,
  elements: [
    { ...diamondFixture, ...elementOverrides },
    { ...ellipseFixture, ...elementOverrides },
    { ...rectangleFixture, ...elementOverrides },
  ],
  ...overrides,
});

export default diagramFixture;
