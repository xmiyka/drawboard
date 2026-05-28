import { DEFAULT_EXPORT_PADDING, EDITOR_LS_KEYS } from "@drawboard/common";

import { EditorLocalStorage } from "../../data/EditorLocalStorage";
import { convertToDrawboardElements, exportToCanvas, THEME } from "../../index";

import type {
  NonDeletedDrawboardElement,
  Theme,
} from "@drawboard/element/types";

import type { MermaidToExcalidrawLibProps } from "./types";

import type { AppClassProperties, BinaryFiles } from "../../types";

export const resetPreview = ({
  canvasRef,
  setError,
}: {
  canvasRef: React.RefObject<HTMLDivElement | null>;
  setError: (error: Error | null) => void;
}) => {
  const canvasNode = canvasRef.current;

  if (!canvasNode) {
    return;
  }
  const parent = canvasNode.parentElement;
  if (!parent) {
    return;
  }
  parent.style.background = "";
  setError(null);
  canvasNode.replaceChildren();
};

export const convertMermaidToExcalidraw = async ({
  canvasRef,
  mermaidToDrawboardLib,
  mermaidDefinition,
  setError,
  data,
  theme,
}: {
  canvasRef: React.RefObject<HTMLDivElement | null>;
  mermaidToDrawboardLib: MermaidToExcalidrawLibProps;
  mermaidDefinition: string;
  setError: (error: Error | null) => void;
  data: React.MutableRefObject<{
    elements: readonly NonDeletedDrawboardElement[];
    files: BinaryFiles | null;
  }>;
  theme: Theme;
}): Promise<{ success: true } | { success: false; error?: Error }> => {
  const canvasNode = canvasRef.current;
  const parent = canvasNode?.parentElement;

  if (!canvasNode || !parent) {
    return { success: false };
  }

  if (!mermaidDefinition) {
    resetPreview({ canvasRef, setError });
    return { success: false };
  }

  let ret;
  try {
    const api = await mermaidToDrawboardLib.api;

    try {
      try {
        ret = await api.parseMermaidToExcalidraw(mermaidDefinition);
      } catch (err: unknown) {
        ret = await api.parseMermaidToExcalidraw(
          mermaidDefinition.replace(/"/g, "'"),
        );
      }
    } catch (err: unknown) {
      return { success: false, error: err as Error };
    }

    const { elements, files } = ret;
    setError(null);

    data.current = {
      elements: convertToDrawboardElements(elements, {
        regenerateIds: true,
      }),
      files,
    };

    const canvas = await exportToCanvas({
      elements: data.current.elements,
      files: data.current.files,
      exportPadding: DEFAULT_EXPORT_PADDING,
      maxWidthOrHeight:
        Math.max(parent.offsetWidth, parent.offsetHeight) *
        window.devicePixelRatio,
      appState: {
        exportWithDarkMode: theme === THEME.DARK,
      },
    });

    parent.style.background = "var(--default-bg-color)";
    canvasNode.replaceChildren(canvas);
    return { success: true };
  } catch (err: any) {
    parent.style.background = "var(--default-bg-color)";
    if (mermaidDefinition) {
      setError(err);
    }

    // Return error so caller can display meaningful error message
    return { success: false, error: err };
  }
};
export const saveMermaidDataToStorage = (mermaidDefinition: string) => {
  EditorLocalStorage.set(
    EDITOR_LS_KEYS.MERMAID_TO_DRAWBOARD,
    mermaidDefinition,
  );
};

export const insertToEditor = ({
  app,
  data,
  text,
  shouldSaveMermaidDataToStorage,
}: {
  app: AppClassProperties;
  data: React.MutableRefObject<{
    elements: readonly NonDeletedDrawboardElement[];
    files: BinaryFiles | null;
  }>;
  text?: string;
  shouldSaveMermaidDataToStorage?: boolean;
}) => {
  const { elements: newElements, files } = data.current;

  if (!newElements.length) {
    return;
  }

  app.addElementsFromPasteOrLibrary({
    elements: newElements,
    files,
    position: "center",
    fitToContent: true,
  });
  app.setOpenDialog(null);

  if (shouldSaveMermaidDataToStorage && text) {
    saveMermaidDataToStorage(text);
  }
};
