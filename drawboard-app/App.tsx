import {
  Drawboard,
  LiveCollaborationTrigger,
  TTDDialogTrigger,
  CaptureUpdateAction,
  reconcileElements,
  useEditorInterface,
} from "@drawboard/drawboard";
import { trackEvent } from "@drawboard/drawboard/analytics";
import { getDefaultAppState } from "@drawboard/drawboard/appState";
import {
  CommandPalette,
  DEFAULT_CATEGORIES,
} from "@drawboard/drawboard/components/CommandPalette/CommandPalette";
import { ErrorDialog } from "@drawboard/drawboard/components/ErrorDialog";
import { OverwriteConfirmDialog } from "@drawboard/drawboard/components/OverwriteConfirm/OverwriteConfirm";
import { openConfirmModal } from "@drawboard/drawboard/components/OverwriteConfirm/OverwriteConfirmState";
import { ShareableLinkDialog } from "@drawboard/drawboard/components/ShareableLinkDialog";
import Trans from "@drawboard/drawboard/components/Trans";
import {
  APP_NAME,
  EVENT,
  THEME,
  VERSION_TIMEOUT,
  debounce,
  getVersion,
  getFrame,
  isTestEnv,
  preventUnload,
  resolvablePromise,
  isRunningInIframe,
  isDevEnv,
} from "@drawboard/common";
import polyfill from "@drawboard/drawboard/polyfill";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadFromBlob } from "@drawboard/drawboard/data/blob";
import { useCallbackRefState } from "@drawboard/drawboard/hooks/useCallbackRefState";
import { t } from "@drawboard/drawboard/i18n";
import { useQuery } from "convex/react";
import { anyApi } from "convex/server";
import { useShooAuth } from "@shoojs/react";

import {
  usersIcon,
  share,
  MoonIcon,
  SunIcon,
  fullscreenIcon,
} from "@drawboard/drawboard/components/icons";
import { Button } from "@drawboard/drawboard/components/Button";
import { isElementLink } from "@drawboard/element";
import {
  bumpElementVersions,
  restoreAppState,
  restoreElements,
} from "@drawboard/drawboard/data/restore";
import { newElementWith } from "@drawboard/element";
import { isInitializedImageElement } from "@drawboard/element";
import clsx from "clsx";
import {
  parseLibraryTokensFromUrl,
  useHandleLibrary,
} from "@drawboard/drawboard/data/library";

import { shooOptions, signIn, signOut as shooSignOut } from "./shoo";
import { CloudStorage, type User } from "./data/CloudStorage";
import { currentUserAtom, saveStatusAtom } from "./app-jotai";
import { BoardListDialog } from "./components/BoardListDialog";

import CustomStats from "./CustomStats";
import {
  Provider,
  useAtom,
  useAtomValue,
  useSetAtom,
  useAtomWithInitialValue,
  appJotaiStore,
} from "./app-jotai";
import {
  FIREBASE_STORAGE_PREFIXES,
  STORAGE_KEYS,
  SYNC_BROWSER_TABS_TIMEOUT,
} from "./app_constants";
import Collab, {
  collabAPIAtom,
  isCollaboratingAtom,
  isOfflineAtom,
} from "./collab/Collab";
import { AppFooter } from "./components/AppFooter";
import { AppMainMenu } from "./components/AppMainMenu";
import { AppWelcomeScreen } from "./components/AppWelcomeScreen";
import { TopErrorBoundary } from "./components/TopErrorBoundary";

import {
  exportToBackend,
  getCollaborationLinkData,
  importFromBackend,
  isCollaborationLink,
} from "./data";

import { updateStaleImageStatuses } from "./data/FileManager";
import {
  importFromLocalStorage,
  importUsernameFromLocalStorage,
} from "./data/localStorage";

import { loadFilesFromFirebase } from "./data/firebase";
import { HAS_CONVEX } from "./data/firebaseApp";
import {
  LibraryIndexedDBAdapter,
  LibraryLocalStorageMigrationAdapter,
  LocalData,
  localStorageQuotaExceededAtom,
} from "./data/LocalData";
import { isBrowserStorageStateNewer } from "./data/tabSync";
import { ShareDialog, shareDialogStateAtom } from "./share/ShareDialog";
import CollabError, { collabErrorIndicatorAtom } from "./collab/CollabError";
import { useHandleAppTheme } from "./useHandleAppTheme";
import { getPreferredLanguage } from "./app-language/language-detector";
import { useAppLangCode } from "./app-language/language-state";
import DebugCanvas, {
  debugRenderer,
  isVisualDebuggerEnabled,
  loadSavedDebugState,
} from "./components/DebugCanvas";
import { AIComponents } from "./components/AI";

import "./index.scss";

import type { RemoteDrawboardElement } from "@drawboard/drawboard/data/reconcile";
import type { RestoredDataState } from "@drawboard/drawboard/data/restore";
import type {
  FileId,
  NonDeletedDrawboardElement,
  OrderedDrawboardElement,
} from "@drawboard/element/types";
import type {
  AppState,
  DrawboardImperativeAPI,
  BinaryFiles,
  DrawboardInitialDataState,
  UIAppState,
} from "@drawboard/drawboard/types";
import type { ResolutionType } from "@drawboard/common/utility-types";
import type { ResolvablePromise } from "@drawboard/common/utils";
import type { CollabAPI } from "./collab/Collab";

polyfill();

window.DRAWBOARD_THROTTLE_RENDER = true;

declare global {
  interface BeforeInstallPromptEventChoiceResult {
    outcome: "accepted" | "dismissed";
  }

  interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<BeforeInstallPromptEventChoiceResult>;
  }

  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

let pwaEvent: BeforeInstallPromptEvent | null = null;

// Adding a listener outside of the component as it may (?) need to be
// subscribed early to catch the event.
//
// Also note that it will fire only if certain heuristics are met (user has
// used the app for some time, etc.)
window.addEventListener(
  "beforeinstallprompt",
  (event: BeforeInstallPromptEvent) => {
    // prevent Chrome <= 67 from automatically showing the prompt
    event.preventDefault();
    // cache for later use
    pwaEvent = event;
  },
);

let isSelfEmbedding = false;

if (window.self !== window.top) {
  try {
    const parentUrl = new URL(document.referrer);
    const currentUrl = new URL(window.location.href);
    if (parentUrl.origin === currentUrl.origin) {
      isSelfEmbedding = true;
    }
  } catch (error) {
    // ignore
  }
}

const shareableLinkConfirmDialog = {
  title: t("overwriteConfirm.modal.shareableLink.title"),
  description: (
    <Trans
      i18nKey="overwriteConfirm.modal.shareableLink.description"
      bold={(text) => <strong>{text}</strong>}
      br={() => <br />}
    />
  ),
  actionLabel: t("overwriteConfirm.modal.shareableLink.button"),
  color: "danger",
} as const;

const initializeScene = async (opts: {
  collabAPI: CollabAPI | null;
  drawboardAPI: DrawboardImperativeAPI;
}): Promise<
  { scene: DrawboardInitialDataState | null } & (
    | { isExternalScene: true; id: string; key: string }
    | { isExternalScene: false; id?: null; key?: null }
  )
> => {
  const searchParams = new URLSearchParams(window.location.search);
  const id = searchParams.get("id");
  const jsonBackendMatch = window.location.hash.match(
    /^#json=([a-zA-Z0-9_-]+),([a-zA-Z0-9_-]+)$/,
  );
  const externalUrlMatch = window.location.hash.match(/^#url=(.*)$/);

  const localDataState = importFromLocalStorage();

  let scene: Omit<
    RestoredDataState,
    // we're not storing files in the scene database/localStorage, and instead
    // fetch them async from a different store
    "files"
  > & {
    scrollToContent?: boolean;
  } = {
    elements: restoreElements(localDataState?.elements, null, {
      repairBindings: true,
      deleteInvisibleElements: true,
    }),
    appState: restoreAppState(localDataState?.appState, null),
  };

  let roomLinkData = getCollaborationLinkData(window.location.href);
  const isExternalScene = !!(id || jsonBackendMatch || roomLinkData);
  if (isExternalScene) {
    if (
      // don't prompt if scene is empty
      !scene.elements.length ||
      // don't prompt for collab scenes because we don't override local storage
      roomLinkData ||
      // otherwise, prompt whether user wants to override current scene
      (await openConfirmModal(shareableLinkConfirmDialog))
    ) {
      if (jsonBackendMatch) {
        const imported = await importFromBackend(
          jsonBackendMatch[1],
          jsonBackendMatch[2],
        );

        scene = {
          elements: bumpElementVersions(
            restoreElements(imported.elements, null, {
              repairBindings: true,
              deleteInvisibleElements: true,
            }),
            localDataState?.elements,
          ),
          appState: restoreAppState(
            imported.appState,
            // local appState when importing from backend to ensure we restore
            // localStorage user settings which we do not persist on server.
            localDataState?.appState,
          ),
        };
      }
      scene.scrollToContent = true;
      if (!roomLinkData) {
        window.history.replaceState({}, APP_NAME, window.location.origin);
      }
    } else {
      // https://github.com/drawboard/drawboard/issues/1919
      if (document.hidden) {
        return new Promise((resolve, reject) => {
          window.addEventListener(
            "focus",
            () => initializeScene(opts).then(resolve).catch(reject),
            {
              once: true,
            },
          );
        });
      }

      roomLinkData = null;
      window.history.replaceState({}, APP_NAME, window.location.origin);
    }
  } else if (externalUrlMatch) {
    window.history.replaceState({}, APP_NAME, window.location.origin);

    const url = externalUrlMatch[1];
    try {
      const request = await fetch(window.decodeURIComponent(url));
      const data = await loadFromBlob(await request.blob(), null, null);
      if (
        !scene.elements.length ||
        (await openConfirmModal(shareableLinkConfirmDialog))
      ) {
        return { scene: data, isExternalScene };
      }
    } catch (error: any) {
      return {
        scene: {
          appState: {
            errorMessage: t("alerts.invalidSceneUrl"),
          },
        },
        isExternalScene,
      };
    }
  }

  if (roomLinkData && opts.collabAPI) {
    const { drawboardAPI } = opts;

    const scene = await opts.collabAPI.startCollaboration(roomLinkData);

    return {
      // when collaborating, the state may have already been updated at this
      // point (we may have received updates from other clients), so reconcile
      // elements and appState with existing state
      scene: {
        ...scene,
        appState: {
          ...restoreAppState(
            {
              ...scene?.appState,
              theme: localDataState?.appState?.theme || scene?.appState?.theme,
            },
            drawboardAPI.getAppState(),
          ),
          // necessary if we're invoking from a hashchange handler which doesn't
          // go through App.initializeScene() that resets this flag
          isLoading: false,
        },
        elements: reconcileElements(
          scene?.elements || [],
          drawboardAPI.getSceneElementsIncludingDeleted() as RemoteDrawboardElement[],
          drawboardAPI.getAppState(),
        ),
      },
      isExternalScene: true,
      id: roomLinkData.roomId,
      key: roomLinkData.roomKey,
    };
  } else if (scene) {
    return isExternalScene && jsonBackendMatch
      ? {
          scene,
          isExternalScene,
          id: jsonBackendMatch[1],
          key: jsonBackendMatch[2],
        }
      : { scene, isExternalScene: false };
  }
  return { scene: null, isExternalScene: false };
};

const DrawboardWrapperBase = ({
  viewer,
}: {
  viewer: User | null | undefined;
}) => {
  const [errorMessage, setErrorMessage] = useState("");
  const [currentUser, setCurrentUser] = useAtom(currentUserAtom);
  const [isBoardListOpen, setIsBoardListOpen] = useState(false);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const activeBoardIdRef = useRef<string | null>(null);
  const activeUserIdRef = useRef<string | null>(null);
  const autoSaveTimeoutRef = useRef<number | null>(null);
  const saveStatusTimeoutRef = useRef<number | null>(null);
  const setSaveStatus = useSetAtom(saveStatusAtom);
  const pendingAutoSaveRef = useRef<{
    elements: readonly OrderedDrawboardElement[];
    appState: AppState;
    files: BinaryFiles;
  } | null>(null);

  const isCollabDisabled = isRunningInIframe();

  const { editorTheme, appTheme, setAppTheme } = useHandleAppTheme();

  const [langCode, setLangCode] = useAppLangCode();

  const editorInterface = useEditorInterface();

  // initial state
  // ---------------------------------------------------------------------------

  const initialStatePromiseRef = useRef<{
    promise: ResolvablePromise<DrawboardInitialDataState | null>;
  }>({ promise: null! });
  if (!initialStatePromiseRef.current.promise) {
    initialStatePromiseRef.current.promise =
      resolvablePromise<DrawboardInitialDataState | null>();
  }

  const debugCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    trackEvent("load", "frame", getFrame());
    // Delayed so that the app has a time to load the latest SW
    setTimeout(() => {
      trackEvent("load", "version", getVersion());
    }, VERSION_TIMEOUT);
  }, []);

  const [drawboardAPI, drawboardRefCallback] =
    useCallbackRefState<DrawboardImperativeAPI>();

  const [, setShareDialogState] = useAtom(shareDialogStateAtom);
  const [collabAPI] = useAtom(collabAPIAtom);
  const [isCollaborating] = useAtomWithInitialValue(isCollaboratingAtom, () => {
    return isCollaborationLink(window.location.href);
  });
  const collabError = useAtomValue(collabErrorIndicatorAtom);

  useHandleLibrary({
    drawboardAPI,
    adapter: LibraryIndexedDBAdapter,
    // TODO maybe remove this in several months (shipped: 24-03-11)
    migrationAdapter: LibraryLocalStorageMigrationAdapter,
  });

  const [, forceRefresh] = useState(false);

  useEffect(() => {
    if (isDevEnv()) {
      const debugState = loadSavedDebugState();

      if (debugState.enabled && !window.visualDebug) {
        window.visualDebug = {
          data: [],
        };
      } else {
        delete window.visualDebug;
      }
      forceRefresh((prev) => !prev);
    }
  }, [drawboardAPI]);

  useEffect(() => {
    activeBoardIdRef.current = activeBoardId;
  }, [activeBoardId]);

  useEffect(() => {
    activeUserIdRef.current = currentUser?.id || null;
  }, [currentUser]);

  useEffect(() => {
    if (viewer === undefined) {
      return;
    }
    setCurrentUser(viewer);
    if (!viewer) {
      setActiveBoardId(null);
    }
  }, [setCurrentUser, viewer]);

  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        window.clearTimeout(autoSaveTimeoutRef.current);
      }
      if (saveStatusTimeoutRef.current) {
        window.clearTimeout(saveStatusTimeoutRef.current);
      }
    };
  }, []);

  const showSaved = useCallback(() => {
    if (saveStatusTimeoutRef.current) {
      window.clearTimeout(saveStatusTimeoutRef.current);
    }
    setSaveStatus("saved");
    saveStatusTimeoutRef.current = window.setTimeout(() => {
      setSaveStatus("idle");
    }, 2500);
  }, [setSaveStatus]);

  const scheduleAutoSaveToCloud = (
    elements: readonly OrderedDrawboardElement[],
    appState: AppState,
    files: BinaryFiles,
  ) => {
    if (!activeBoardIdRef.current || !activeUserIdRef.current) {
      return;
    }

    pendingAutoSaveRef.current = {
      elements,
      appState,
      files,
    };

    if (autoSaveTimeoutRef.current) {
      window.clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = window.setTimeout(async () => {
      const boardId = activeBoardIdRef.current;
      const payload = pendingAutoSaveRef.current;

      if (!boardId || !payload || !activeUserIdRef.current) {
        return;
      }

      setSaveStatus("saving");
      try {
        await CloudStorage.updateBoard(
          boardId,
          payload.elements,
          payload.appState,
          undefined,
          payload.files,
        );
        showSaved();
      } catch (error) {
        console.error("Failed to auto-save board:", error);
        setSaveStatus("error");
      }
    }, 1200);
  };

  const saveNow = useCallback(async () => {
    const boardId = activeBoardIdRef.current;
    if (!boardId || !activeUserIdRef.current || !drawboardAPI) {
      return;
    }

    // Cancel any pending debounced save
    if (autoSaveTimeoutRef.current) {
      window.clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = null;
    }
    pendingAutoSaveRef.current = null;

    setSaveStatus("saving");
    try {
      await CloudStorage.updateBoard(
        boardId,
        drawboardAPI.getSceneElements(),
        drawboardAPI.getAppState(),
        undefined,
        drawboardAPI.getFiles(),
      );
      showSaved();
    } catch (error) {
      console.error("Failed to save board:", error);
      setSaveStatus("error");
    }
  }, [drawboardAPI, setSaveStatus, showSaved]);

  useEffect(() => {
    if (!drawboardAPI || (!isCollabDisabled && !collabAPI)) {
      return;
    }

    const loadImages = (
      data: ResolutionType<typeof initializeScene>,
      isInitialLoad = false,
    ) => {
      if (!data.scene) {
        return;
      }
      if (collabAPI?.isCollaborating()) {
        if (data.scene.elements) {
          collabAPI
            .fetchImageFilesFromFirebase({
              elements: data.scene.elements,
              forceFetchFiles: true,
            })
            .then(({ loadedFiles, erroredFiles }) => {
              drawboardAPI.addFiles(loadedFiles);
              updateStaleImageStatuses({
                drawboardAPI,
                erroredFiles,
                elements: drawboardAPI.getSceneElementsIncludingDeleted(),
              });
            });
        }
      } else {
        const fileIds =
          data.scene.elements?.reduce((acc, element) => {
            if (isInitializedImageElement(element)) {
              return acc.concat(element.fileId);
            }
            return acc;
          }, [] as FileId[]) || [];

        if (data.isExternalScene) {
          loadFilesFromFirebase(
            `${FIREBASE_STORAGE_PREFIXES.shareLinkFiles}/${data.id}`,
            data.key,
            fileIds,
          ).then(({ loadedFiles, erroredFiles }) => {
            drawboardAPI.addFiles(loadedFiles);
            updateStaleImageStatuses({
              drawboardAPI,
              erroredFiles,
              elements: drawboardAPI.getSceneElementsIncludingDeleted(),
            });
          });
        } else if (isInitialLoad) {
          if (fileIds.length) {
            LocalData.fileStorage
              .getFiles(fileIds)
              .then(({ loadedFiles, erroredFiles }) => {
                if (loadedFiles.length) {
                  drawboardAPI.addFiles(loadedFiles);
                }
                updateStaleImageStatuses({
                  drawboardAPI,
                  erroredFiles,
                  elements: drawboardAPI.getSceneElementsIncludingDeleted(),
                });
              });
          }
          // on fresh load, clear unused files from IDB (from previous
          // session)
          LocalData.fileStorage.clearObsoleteFiles({ currentFileIds: fileIds });
        }
      }
    };

    initializeScene({ collabAPI, drawboardAPI }).then(async (data) => {
      loadImages(data, /* isInitialLoad */ true);
      initialStatePromiseRef.current.promise.resolve(data.scene);
    });

    const onHashChange = async (event: HashChangeEvent) => {
      event.preventDefault();
      const libraryUrlTokens = parseLibraryTokensFromUrl();
      if (!libraryUrlTokens) {
        if (
          collabAPI?.isCollaborating() &&
          !isCollaborationLink(window.location.href)
        ) {
          collabAPI.stopCollaboration(false);
        }
        drawboardAPI.updateScene({ appState: { isLoading: true } });

        initializeScene({ collabAPI, drawboardAPI }).then((data) => {
          loadImages(data);
          if (data.scene) {
            drawboardAPI.updateScene({
              elements: restoreElements(data.scene.elements, null, {
                repairBindings: true,
              }),
              appState: restoreAppState(data.scene.appState, null),
              captureUpdate: CaptureUpdateAction.IMMEDIATELY,
            });
          }
        });
      }
    };

    const syncData = debounce(() => {
      if (isTestEnv()) {
        return;
      }
      if (
        !document.hidden &&
        ((collabAPI && !collabAPI.isCollaborating()) || isCollabDisabled)
      ) {
        // don't sync if local state is newer or identical to browser state
        if (isBrowserStorageStateNewer(STORAGE_KEYS.VERSION_DATA_STATE)) {
          const localDataState = importFromLocalStorage();
          const username = importUsernameFromLocalStorage();
          setLangCode(getPreferredLanguage());
          drawboardAPI.updateScene({
            ...localDataState,
            captureUpdate: CaptureUpdateAction.NEVER,
          });
          LibraryIndexedDBAdapter.load().then((data) => {
            if (data) {
              drawboardAPI.updateLibrary({
                libraryItems: data.libraryItems,
              });
            }
          });
          collabAPI?.setUsername(username || "");
        }

        if (isBrowserStorageStateNewer(STORAGE_KEYS.VERSION_FILES)) {
          const elements = drawboardAPI.getSceneElementsIncludingDeleted();
          const currFiles = drawboardAPI.getFiles();
          const fileIds =
            elements?.reduce((acc, element) => {
              if (
                isInitializedImageElement(element) &&
                // only load and update images that aren't already loaded
                !currFiles[element.fileId]
              ) {
                return acc.concat(element.fileId);
              }
              return acc;
            }, [] as FileId[]) || [];
          if (fileIds.length) {
            LocalData.fileStorage
              .getFiles(fileIds)
              .then(({ loadedFiles, erroredFiles }) => {
                if (loadedFiles.length) {
                  drawboardAPI.addFiles(loadedFiles);
                }
                updateStaleImageStatuses({
                  drawboardAPI,
                  erroredFiles,
                  elements: drawboardAPI.getSceneElementsIncludingDeleted(),
                });
              });
          }
        }
      }
    }, SYNC_BROWSER_TABS_TIMEOUT);

    const onUnload = () => {
      LocalData.flushSave();
    };

    const visibilityChange = (event: FocusEvent | Event) => {
      if (event.type === EVENT.BLUR || document.hidden) {
        LocalData.flushSave();
      }
      if (
        event.type === EVENT.VISIBILITY_CHANGE ||
        event.type === EVENT.FOCUS
      ) {
        syncData();
      }
    };

    window.addEventListener(EVENT.HASHCHANGE, onHashChange, false);
    window.addEventListener(EVENT.UNLOAD, onUnload, false);
    window.addEventListener(EVENT.BLUR, visibilityChange, false);
    document.addEventListener(EVENT.VISIBILITY_CHANGE, visibilityChange, false);
    window.addEventListener(EVENT.FOCUS, visibilityChange, false);
    return () => {
      window.removeEventListener(EVENT.HASHCHANGE, onHashChange, false);
      window.removeEventListener(EVENT.UNLOAD, onUnload, false);
      window.removeEventListener(EVENT.BLUR, visibilityChange, false);
      window.removeEventListener(EVENT.FOCUS, visibilityChange, false);
      document.removeEventListener(
        EVENT.VISIBILITY_CHANGE,
        visibilityChange,
        false,
      );
    };
  }, [isCollabDisabled, collabAPI, drawboardAPI, setLangCode]);

  // Ctrl+S / Cmd+S — save active cloud board immediately
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "s") {
        if (activeBoardIdRef.current) {
          event.preventDefault();
          void saveNow();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [saveNow]);

  useEffect(() => {
    const unloadHandler = (event: BeforeUnloadEvent) => {
      LocalData.flushSave();

      if (
        drawboardAPI &&
        LocalData.fileStorage.shouldPreventUnload(
          drawboardAPI.getSceneElements(),
        )
      ) {
        if (import.meta.env.VITE_APP_DISABLE_PREVENT_UNLOAD !== "true") {
          preventUnload(event);
        } else {
          console.warn(
            "preventing unload disabled (VITE_APP_DISABLE_PREVENT_UNLOAD)",
          );
        }
      }
    };
    window.addEventListener(EVENT.BEFORE_UNLOAD, unloadHandler);
    return () => {
      window.removeEventListener(EVENT.BEFORE_UNLOAD, unloadHandler);
    };
  }, [drawboardAPI]);

  const onChange = (
    elements: readonly OrderedDrawboardElement[],
    appState: AppState,
    files: BinaryFiles,
  ) => {
    if (collabAPI?.isCollaborating()) {
      collabAPI.syncElements(elements);
    }

    scheduleAutoSaveToCloud(elements, appState, files);

    // this check is redundant, but since this is a hot path, it's best
    // not to evaludate the nested expression every time
    if (!LocalData.isSavePaused()) {
      LocalData.save(elements, appState, files, () => {
        if (drawboardAPI) {
          let didChange = false;

          const elements = drawboardAPI
            .getSceneElementsIncludingDeleted()
            .map((element) => {
              if (
                LocalData.fileStorage.shouldUpdateImageElementStatus(element)
              ) {
                const newElement = newElementWith(element, { status: "saved" });
                if (newElement !== element) {
                  didChange = true;
                }
                return newElement;
              }
              return element;
            });

          if (didChange) {
            drawboardAPI.updateScene({
              elements,
              captureUpdate: CaptureUpdateAction.NEVER,
            });
          }
        }
      });
    }

    // Render the debug scene if the debug canvas is available
    if (debugCanvasRef.current && drawboardAPI) {
      debugRenderer(
        debugCanvasRef.current,
        appState,
        elements,
        window.devicePixelRatio,
      );
    }
  };

  const [latestShareableLink, setLatestShareableLink] = useState<string | null>(
    null,
  );

  const onExportToBackend = async (
    exportedElements: readonly NonDeletedDrawboardElement[],
    appState: Partial<AppState>,
    files: BinaryFiles,
  ) => {
    if (exportedElements.length === 0) {
      throw new Error(t("alerts.cannotExportEmptyCanvas"));
    }
    try {
      const { url, errorMessage } = await exportToBackend(
        exportedElements,
        {
          ...appState,
          viewBackgroundColor: appState.exportBackground
            ? appState.viewBackgroundColor
            : getDefaultAppState().viewBackgroundColor,
        },
        files,
      );

      if (errorMessage) {
        throw new Error(errorMessage);
      }

      if (url) {
        setLatestShareableLink(url);
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        const { width, height } = appState;
        console.error(error, {
          width,
          height,
          devicePixelRatio: window.devicePixelRatio,
        });
        throw new Error(error.message);
      }
    }
  };

  const renderCustomStats = (
    elements: readonly NonDeletedDrawboardElement[],
    appState: UIAppState,
  ) => {
    return (
      <CustomStats
        setToast={(message) => drawboardAPI!.setToast({ message })}
        appState={appState}
        elements={elements}
      />
    );
  };

  const isOffline = useAtomValue(isOfflineAtom);

  const localStorageQuotaExceeded = useAtomValue(localStorageQuotaExceededAtom);

  const onCollabDialogOpen = useCallback(
    () => setShareDialogState({ isOpen: true, type: "collaborationOnly" }),
    [setShareDialogState],
  );

  const onCloudSignIn = useCallback(async () => {
    await signIn();
  }, []);

  const onCloudSignOut = useCallback(async () => {
    setActiveBoardId(null);
    setCurrentUser(null);
    shooSignOut();
  }, [setCurrentUser]);

  // browsers generally prevent infinite self-embedding, there are
  // cases where it still happens, and while we disallow self-embedding
  // by not whitelisting our own origin, this serves as an additional guard
  if (isSelfEmbedding) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          height: "100%",
        }}
      >
        <h1>I'm not a pretzel!</h1>
      </div>
    );
  }

  return (
    <div
      style={{ height: "100%" }}
      className={clsx("drawboard-app", {
        "is-collaborating": isCollaborating,
      })}
    >
      <Drawboard
        drawboardAPI={drawboardRefCallback}
        onChange={onChange}
        initialData={initialStatePromiseRef.current.promise}
        isCollaborating={isCollaborating}
        onPointerUpdate={collabAPI?.onPointerUpdate}
        UIOptions={{
          canvasActions: {
            toggleTheme: true,
          },
        }}
        langCode={langCode}
        renderCustomStats={renderCustomStats}
        detectScroll={false}
        handleKeyboardGlobally={true}
        autoFocus={true}
        theme={editorTheme}
        renderTopRightUI={(isMobile) => {
          if (isMobile || !collabAPI || isCollabDisabled) {
            return null;
          }

          return (
            <div className="drawboard-ui-top-right">
              <Button
                onSelect={() => {
                  const appState = drawboardAPI?.getAppState();
                  if (appState) {
                    drawboardAPI?.updateScene({
                      appState: { zenModeEnabled: !appState.zenModeEnabled },
                    });
                  }
                }}
                title="Toggle Zen Mode"
                style={{
                  height: "2.5rem",
                  width: "2.5rem",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  border: "none",
                  backgroundColor: "var(--color-surface-low)",
                  color: "var(--icon-fill-color)",
                  borderRadius: "var(--border-radius-lg)",
                }}
              >
                {fullscreenIcon}
              </Button>
              <Button
                onSelect={() =>
                  setAppTheme(
                    editorTheme === THEME.DARK ? THEME.LIGHT : THEME.DARK,
                  )
                }
                title="Toggle Theme"
                style={{
                  height: "2.5rem",
                  width: "2.5rem",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  border: "none",
                  backgroundColor: "var(--color-surface-low)",
                  color: "var(--icon-fill-color)",
                  borderRadius: "var(--border-radius-lg)",
                }}
              >
                {editorTheme === THEME.DARK ? SunIcon : MoonIcon}
              </Button>
              {collabError.message && <CollabError collabError={collabError} />}
              <LiveCollaborationTrigger
                isCollaborating={isCollaborating}
                onSelect={() =>
                  setShareDialogState({ isOpen: true, type: "share" })
                }
                editorInterface={editorInterface}
              />
            </div>
          );
        }}
        onLinkOpen={(element, event) => {
          if (element.link && isElementLink(element.link)) {
            event.preventDefault();
            drawboardAPI?.scrollToContent(element.link, { animate: true });
          }
        }}
      >
        <AppMainMenu
          onCollabDialogOpen={onCollabDialogOpen}
          isCollaborating={isCollaborating}
          isCollabEnabled={!isCollabDisabled}
          currentUser={currentUser}
          onCloudBoardsOpen={() => setIsBoardListOpen(true)}
          onCloudSignIn={onCloudSignIn}
          onCloudSignOut={onCloudSignOut}
          theme={appTheme}
          setTheme={(theme) => setAppTheme(theme)}
          refresh={() => forceRefresh((prev) => !prev)}
        />
        <AppWelcomeScreen
          onCollabDialogOpen={onCollabDialogOpen}
          isCollabEnabled={!isCollabDisabled}
          onOpenBoards={() => setIsBoardListOpen(true)}
        />
        <OverwriteConfirmDialog>
          <OverwriteConfirmDialog.Actions.ExportToImage />
          <OverwriteConfirmDialog.Actions.SaveToDisk />
        </OverwriteConfirmDialog>
        <AppFooter onChange={() => drawboardAPI?.refresh()} />
        {drawboardAPI && <AIComponents drawboardAPI={drawboardAPI} />}

        <TTDDialogTrigger />
        {isCollaborating && isOffline && (
          <div className="alertalert--warning">
            {t("alerts.collabOfflineWarning")}
          </div>
        )}
        {localStorageQuotaExceeded && (
          <div className="alert alert--danger">
            {t("alerts.localStorageQuotaExceeded")}
          </div>
        )}
        {latestShareableLink && (
          <ShareableLinkDialog
            link={latestShareableLink}
            onCloseRequest={() => setLatestShareableLink(null)}
            setErrorMessage={setErrorMessage}
          />
        )}
        {drawboardAPI && !isCollabDisabled && (
          <Collab drawboardAPI={drawboardAPI} />
        )}

        <ShareDialog
          collabAPI={collabAPI}
          onExportToBackend={async () => {
            if (drawboardAPI) {
              try {
                await onExportToBackend(
                  drawboardAPI.getSceneElements(),
                  drawboardAPI.getAppState(),
                  drawboardAPI.getFiles(),
                );
              } catch (error: any) {
                setErrorMessage(error.message);
              }
            }
          }}
        />

        {isBoardListOpen && drawboardAPI && (
          <BoardListDialog
            drawboardAPI={drawboardAPI}
            onClose={() => setIsBoardListOpen(false)}
            activeBoardId={activeBoardId}
            onActiveBoardChange={setActiveBoardId}
          />
        )}

        {errorMessage && (
          <ErrorDialog onClose={() => setErrorMessage("")}>
            {errorMessage}
          </ErrorDialog>
        )}

        <CommandPalette
          customCommandPaletteItems={[
            {
              label: t("labels.liveCollaboration"),
              category: DEFAULT_CATEGORIES.app,
              keywords: [
                "team",
                "multiplayer",
                "share",
                "public",
                "session",
                "invite",
              ],
              icon: usersIcon,
              perform: () => {
                setShareDialogState({
                  isOpen: true,
                  type: "collaborationOnly",
                });
              },
            },
            {
              label: t("roomDialog.button_stopSession"),
              category: DEFAULT_CATEGORIES.app,
              predicate: () => !!collabAPI?.isCollaborating(),
              keywords: [
                "stop",
                "session",
                "end",
                "leave",
                "close",
                "exit",
                "collaboration",
              ],
              perform: () => {
                if (collabAPI) {
                  collabAPI.stopCollaboration();
                  if (!collabAPI.isCollaborating()) {
                    setShareDialogState({ isOpen: false });
                  }
                }
              },
            },
            {
              label: t("labels.share"),
              category: DEFAULT_CATEGORIES.app,
              predicate: true,
              icon: share,
              keywords: [
                "link",
                "shareable",
                "readonly",
                "export",
                "publish",
                "snapshot",
                "url",
                "collaborate",
                "invite",
              ],
              perform: async () => {
                setShareDialogState({ isOpen: true, type: "share" });
              },
            },
            {
              ...CommandPalette.defaultItems.toggleTheme,
              perform: () => {
                setAppTheme(
                  editorTheme === THEME.DARK ? THEME.LIGHT : THEME.DARK,
                );
              },
            },
            {
              label: t("labels.installPWA"),
              category: DEFAULT_CATEGORIES.app,
              predicate: () => !!pwaEvent,
              perform: () => {
                if (pwaEvent) {
                  pwaEvent.prompt();
                  pwaEvent.userChoice.then(() => {
                    // event cannot be reused, but we'll hopefully
                    // grab new one as the event should be fired again
                    pwaEvent = null;
                  });
                }
              },
            },
          ]}
        />
        {isVisualDebuggerEnabled() && drawboardAPI && (
          <DebugCanvas
            appState={drawboardAPI.getAppState()}
            scale={window.devicePixelRatio}
            ref={debugCanvasRef}
          />
        )}
      </Drawboard>
    </div>
  );
};

const DrawboardWrapperWithConvex = () => {
  const viewer = useQuery(anyApi.users.getViewer, {});
  return <DrawboardWrapperBase viewer={viewer} />;
};

const DrawboardWrapperWithoutConvex = () => {
  const { identity, claims } = useShooAuth({
    ...shooOptions,
    autoHandleCallback: false,
  });
  const viewer = useMemo<User | null>(() => {
    if (!identity.userId) {
      return null;
    }
    return {
      id: identity.userId,
      name: claims?.name ?? claims?.email ?? "Drawboard User",
      email: claims?.email ?? "",
      photoURL: claims?.picture ?? undefined,
    };
  }, [claims?.email, claims?.name, claims?.picture, identity.userId]);
  return <DrawboardWrapperBase viewer={viewer} />;
};

const DrawboardApp = () => {
  return (
    <TopErrorBoundary>
      <Provider store={appJotaiStore}>
        {HAS_CONVEX ? (
          <DrawboardWrapperWithConvex />
        ) : (
          <DrawboardWrapperWithoutConvex />
        )}
      </Provider>
    </TopErrorBoundary>
  );
};

export default DrawboardApp;
