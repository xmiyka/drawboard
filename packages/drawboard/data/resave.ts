import { getFileHandleType, isImageFileHandleType } from "./blob";

import { exportCanvas, prepareElementsForExport } from ".";

import type { DrawboardElement } from "@drawboard/element/types";

import type { AppState, BinaryFiles } from "../types";

export const resaveAsImageWithScene = async (
  elements: readonly DrawboardElement[],
  appState: AppState,
  files: BinaryFiles,
  name: string,
) => {
  const { exportBackground, viewBackgroundColor, fileHandle } = appState;

  const fileHandleType = getFileHandleType(fileHandle);

  if (!fileHandle || !isImageFileHandleType(fileHandleType)) {
    throw new Error(
      "fileHandle should exist and should be of type svg or png when resaving",
    );
  }
  appState = {
    ...appState,
    exportEmbedScene: true,
  };

  const { exportedElements, exportingFrame } = prepareElementsForExport(
    elements,
    appState,
    false,
  );

  await exportCanvas(fileHandleType, exportedElements, appState, files, {
    exportBackground,
    viewBackgroundColor,
    name,
    fileHandle,
    exportingFrame,
  });

  return { fileHandle };
};
