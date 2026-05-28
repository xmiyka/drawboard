import type { DrawboardTextContainer } from "./types";

export const originalContainerCache: {
  [id: DrawboardTextContainer["id"]]:
    | {
        height: DrawboardTextContainer["height"];
      }
    | undefined;
} = {};

export const updateOriginalContainerCache = (
  id: DrawboardTextContainer["id"],
  height: DrawboardTextContainer["height"],
) => {
  const data =
    originalContainerCache[id] || (originalContainerCache[id] = { height });
  data.height = height;
  return data;
};

export const resetOriginalContainerCache = (
  id: DrawboardTextContainer["id"],
) => {
  if (originalContainerCache[id]) {
    delete originalContainerCache[id];
  }
};

export const getOriginalContainerHeightFromCache = (
  id: DrawboardTextContainer["id"],
) => {
  return originalContainerCache[id]?.height ?? null;
};
