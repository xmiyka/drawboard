import { DEFAULT_FONT_FAMILY } from "@drawboard/common";

import type { Radians } from "@drawboard/math";

import type { DrawboardElement } from "@drawboard/element/types";

const elementBase: Omit<DrawboardElement, "type"> = {
  id: "vWrqOAfkind2qcm7LDAGZ",
  x: 414,
  y: 237,
  width: 214,
  height: 214,
  angle: 0 as Radians,
  strokeColor: "#000000",
  backgroundColor: "#15aabf",
  fillStyle: "hachure",
  strokeWidth: 1,
  strokeStyle: "solid",
  roughness: 1,
  opacity: 100,
  groupIds: [],
  frameId: null,
  roundness: null,
  index: null,
  seed: 1041657908,
  version: 120,
  versionNonce: 1188004276,
  isDeleted: false,
  boundElements: null,
  updated: 1,
  link: null,
  locked: false,
};

export const rectangleFixture: DrawboardElement = {
  ...elementBase,
  type: "rectangle",
};
export const embeddableFixture: DrawboardElement = {
  ...elementBase,
  type: "embeddable",
};
export const ellipseFixture: DrawboardElement = {
  ...elementBase,
  type: "ellipse",
};
export const diamondFixture: DrawboardElement = {
  ...elementBase,
  type: "diamond",
};
export const rectangleWithLinkFixture: DrawboardElement = {
  ...elementBase,
  type: "rectangle",
  link: "drawboard.com",
};

export const textFixture: DrawboardElement = {
  ...elementBase,
  type: "text",
  fontSize: 20,
  fontFamily: DEFAULT_FONT_FAMILY,
  strokeColor: "#1e1e1e",
  text: "original text",
  originalText: "original text",
  textAlign: "left",
  verticalAlign: "top",
  containerId: null,
  lineHeight: 1.25 as any,
  autoResize: false,
};
