/**
 * CloudStorage — User authentication and board persistence backed by Convex.
 */

import { anyApi } from "convex/server";

import { clearAppStateForDatabase } from "@drawboard/drawboard/appState";
import { generateEncryptionKey } from "@drawboard/drawboard/data/encryption";

import { isInitializedImageElement } from "@drawboard/element";

import {
  FILE_UPLOAD_MAX_BYTES,
  FIREBASE_STORAGE_PREFIXES,
} from "../app_constants";

import { HAS_CONVEX, getConvexClient, logAnalyticsEvent } from "./firebaseApp";
import { encodeFilesForUpload } from "./FileManager";
import { loadFilesFromFirebase, saveFilesToFirebase } from "./firebase";

import type { DrawboardElement, FileId } from "@drawboard/element/types";
import type {
  AppState,
  BinaryFileData,
  BinaryFiles,
} from "@drawboard/drawboard/types";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface User {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
}

export interface Board {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  elements: readonly DrawboardElement[];
  appState: Partial<AppState>;
  files: BinaryFiles;
}

type BoardDoc = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  scene?: string | null;
  fileEncryptionKey?: string | null;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LS_KEYS = {
  BOARDS: "drawboard_cloud_boards",
} as const;

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

const ls = {
  get: <T>(key: string): T | null => {
    try {
      const v = localStorage.getItem(key);
      return v ? (JSON.parse(v) as T) : null;
    } catch {
      return null;
    }
  },
  set: <T>(key: string, value: T): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // quota exceeded or private mode — best effort
    }
  },
  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  },
};

const createBoardId = (): string =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `board_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

const sanitizeAppState = (appState: Partial<AppState>): Partial<AppState> =>
  clearAppStateForDatabase(appState) as Partial<AppState>;

/** Deep-strip `undefined` values so Firestore/JSON serialisation is clean. */
const stripUndefined = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map(stripUndefined) as T;
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, stripUndefined(v)]),
    ) as T;
  }
  return value;
};

const serializeScene = (
  elements: readonly DrawboardElement[],
  appState: Partial<AppState>,
): string => JSON.stringify({ elements, appState: sanitizeAppState(appState) });

const deserializeScene = (
  scene: string | undefined,
): {
  elements: readonly DrawboardElement[];
  appState: Partial<AppState>;
} | null => {
  if (!scene) {
    return null;
  }
  try {
    const parsed = JSON.parse(scene) as {
      elements?: DrawboardElement[];
      appState?: Partial<AppState>;
    };
    return {
      elements: parsed.elements ?? [],
      appState: sanitizeAppState(parsed.appState ?? {}),
    };
  } catch {
    return null;
  }
};

const getBoardCacheKey = (userId: string, boardId: string) =>
  `${userId}:${boardId}`;

const boardFileKeyCache = new Map<string, string>();
const boardFileVersionCache = new Map<string, Map<FileId, number>>();

const getFileVersion = (file: BinaryFileData) => file.version ?? 1;

const collectFilesForElements = (
  elements: readonly DrawboardElement[],
  files: BinaryFiles,
) => {
  const collected = new Map<FileId, BinaryFileData>();
  elements.forEach((element) => {
    if (isInitializedImageElement(element)) {
      const file = files[element.fileId];
      if (file) {
        collected.set(element.fileId, file);
      }
    }
  });
  return collected;
};

const getFilesToUpload = (
  userId: string,
  boardId: string,
  elements: readonly DrawboardElement[],
  files: BinaryFiles,
) => {
  const collected = collectFilesForElements(elements, files);
  if (!collected.size) {
    return collected;
  }
  const cacheKey = getBoardCacheKey(userId, boardId);
  const versions = boardFileVersionCache.get(cacheKey);
  if (!versions) {
    return collected;
  }
  const pending = new Map<FileId, BinaryFileData>();
  collected.forEach((file, id) => {
    if (versions.get(id) !== getFileVersion(file)) {
      pending.set(id, file);
    }
  });
  return pending;
};

const getBoardFilesPrefix = (userId: string, boardId: string) =>
  `${FIREBASE_STORAGE_PREFIXES.boardFiles}/${userId}/${boardId}`;

const uploadBoardFiles = async ({
  userId,
  boardId,
  files,
  encryptionKey,
}: {
  userId: string;
  boardId: string;
  files: Map<FileId, BinaryFileData>;
  encryptionKey: string;
}) => {
  if (!files.size) {
    return;
  }
  const processedFiles = await encodeFilesForUpload({
    files,
    maxBytes: FILE_UPLOAD_MAX_BYTES,
    encryptionKey,
  });
  const { savedFiles } = await saveFilesToFirebase({
    prefix: getBoardFilesPrefix(userId, boardId),
    files: processedFiles,
  });
  if (!savedFiles.length) {
    return;
  }
  const cacheKey = getBoardCacheKey(userId, boardId);
  const versionCache = boardFileVersionCache.get(cacheKey) ?? new Map();
  savedFiles.forEach((fileId) => {
    const file = files.get(fileId);
    if (file) {
      versionCache.set(fileId, getFileVersion(file));
    }
  });
  boardFileVersionCache.set(cacheKey, versionCache);
};

const getBoardFileKey = async (userId: string, boardId: string) => {
  const cacheKey = getBoardCacheKey(userId, boardId);
  const cachedKey = boardFileKeyCache.get(cacheKey);
  if (cachedKey) {
    return cachedKey;
  }
  const client = getConvexClient();
  if (!client) {
    return null;
  }
  const data = await client.query(anyApi.boards.getBoard, {
    boardId,
  });
  if (!data?.fileEncryptionKey) {
    return null;
  }
  boardFileKeyCache.set(cacheKey, data.fileEncryptionKey);
  return data.fileEncryptionKey;
};

const getFileIdsFromElements = (elements: readonly DrawboardElement[]) =>
  elements
    .filter((element) => isInitializedImageElement(element))
    .map((element) => element.fileId);

// ---------------------------------------------------------------------------
// Local-only fallback (Convex not configured)
// ---------------------------------------------------------------------------

const getFallbackBoards = (): Board[] =>
  (ls.get<Board[]>(LS_KEYS.BOARDS) ?? []).map((b) => ({
    ...b,
    elements: b.elements ?? [],
    appState: sanitizeAppState(b.appState ?? {}),
    files: b.files ?? ({} as BinaryFiles),
  }));

const setFallbackBoards = (boards: Board[]) => ls.set(LS_KEYS.BOARDS, boards);

const shouldFallbackToLocal = (error: unknown): boolean => {
  const message = (error as { message?: string } | null)?.message ?? "";
  return (
    message.toLowerCase().includes("not authenticated") ||
    message.toLowerCase().includes("sign in")
  );
};

const requireAuth = async (): Promise<User> => {
  const client = getConvexClient();
  if (!client) {
    throw new Error("Convex is not configured.");
  }
  const user = await client.query(anyApi.users.getViewer, {});
  if (!user) {
    throw new Error("Please sign in first.");
  }
  return user;
};

// ---------------------------------------------------------------------------
// CloudStorage public API
// ---------------------------------------------------------------------------

export const CloudStorage = {
  // -------------------------------------------------------------------------
  // Boards
  // -------------------------------------------------------------------------

  /**
   * Returns board metadata (id, name, timestamps) for listing.
   * Elements / appState are NOT loaded here — call loadBoard() for the full scene.
   * Files are not loaded here.
   */
  getBoards: async (): Promise<Board[]> => {
    if (!HAS_CONVEX) {
      return getFallbackBoards().sort((a, b) => b.updatedAt - a.updatedAt);
    }
    try {
      await requireAuth();
      const client = getConvexClient();
      if (!client) {
        throw new Error("Convex is not configured.");
      }
      const boards = await client.query(anyApi.boards.listBoards, {});
      return boards.map((board: BoardDoc) => ({
        id: board.id,
        name: board.name ?? "Untitled board",
        createdAt: board.createdAt,
        updatedAt: board.updatedAt,
        elements: [],
        appState: {},
        files: {} as BinaryFiles,
      }));
    } catch (error) {
      if (shouldFallbackToLocal(error)) {
        return getFallbackBoards().sort((a, b) => b.updatedAt - a.updatedAt);
      }
      throw error;
    }
  },

  /**
   * Creates a new board in Firestore.
   * Binary files are uploaded to Firebase Storage when available.
   * Returns the saved Board.
   */
  saveBoard: async (
    name: string,
    elements: readonly DrawboardElement[],
    appState: Partial<AppState>,
    files: BinaryFiles = {} as BinaryFiles,
  ): Promise<Board> => {
    const sanitizedAppState = sanitizeAppState(appState);

    if (!HAS_CONVEX) {
      const boards = getFallbackBoards();
      const now = Date.now();
      const board: Board = {
        id: createBoardId(),
        name: name.trim() || "Untitled board",
        createdAt: now,
        updatedAt: now,
        elements,
        appState: sanitizedAppState,
        files,
      };
      boards.push(board);
      setFallbackBoards(boards);
      return board;
    }

    try {
      const user = await requireAuth();
      const client = getConvexClient();
      if (!client) {
        throw new Error("Convex is not configured.");
      }
      const boardName = name.trim() || "Untitled board";
      const filesToUpload = collectFilesForElements(elements, files);
      const fileEncryptionKey = await generateEncryptionKey();
      const { id: boardId } = await client.mutation(anyApi.boards.createBoard, {
        name: boardName,
        scene: serializeScene(elements, sanitizedAppState),
        fileEncryptionKey,
      });
      const cacheKey = getBoardCacheKey(user.id, boardId);
      boardFileKeyCache.set(cacheKey, fileEncryptionKey);

      if (filesToUpload.size) {
        await uploadBoardFiles({
          userId: user.id,
          boardId,
          files: filesToUpload,
          encryptionKey: fileEncryptionKey,
        });
      }

      logAnalyticsEvent("board_create");

      const now = Date.now();
      return {
        id: boardId,
        name: boardName,
        createdAt: now,
        updatedAt: now,
        elements,
        appState: sanitizedAppState,
        files,
      };
    } catch (error) {
      if (shouldFallbackToLocal(error)) {
        const boards = getFallbackBoards();
        const now = Date.now();
        const board: Board = {
          id: createBoardId(),
          name: name.trim() || "Untitled board",
          createdAt: now,
          updatedAt: now,
          elements,
          appState: sanitizedAppState,
          files,
        };
        boards.push(board);
        setFallbackBoards(boards);
        return board;
      }
      throw error;
    }
  },

  /**
   * Updates an existing board's scene data in Firestore.
   * Binary files are uploaded to Firebase Storage when available.
   */
  updateBoard: async (
    id: string,
    elements: readonly DrawboardElement[],
    appState: Partial<AppState>,
    name?: string,
    files: BinaryFiles = {} as BinaryFiles,
  ): Promise<void> => {
    const sanitizedAppState = sanitizeAppState(appState);

    if (!HAS_CONVEX) {
      const boards = getFallbackBoards();
      const index = boards.findIndex((b) => b.id === id);
      if (index >= 0) {
        boards[index] = {
          ...boards[index],
          name: name?.trim() ?? boards[index].name,
          elements,
          appState: sanitizedAppState,
          files,
          updatedAt: Date.now(),
        };
        setFallbackBoards(boards);
      }
      return;
    }

    try {
      const user = await requireAuth();
      const client = getConvexClient();
      if (!client) {
        throw new Error("Convex is not configured.");
      }
      const cacheKey = getBoardCacheKey(user.id, id);
      const filesToUpload = getFilesToUpload(user.id, id, elements, files);
      let fileEncryptionKey: string | null =
        filesToUpload.size > 0 ? boardFileKeyCache.get(cacheKey) ?? null : null;
      if (filesToUpload.size > 0 && !fileEncryptionKey) {
        fileEncryptionKey = await getBoardFileKey(user.id, id);
      }
      let fileEncryptionKeyToSave: string | undefined;
      if (filesToUpload.size > 0 && !fileEncryptionKey) {
        fileEncryptionKeyToSave = await generateEncryptionKey();
        fileEncryptionKey = fileEncryptionKeyToSave;
        boardFileKeyCache.set(cacheKey, fileEncryptionKeyToSave);
      }

      await client.mutation(
        anyApi.boards.updateBoard,
        stripUndefined({
          boardId: id,
          scene: serializeScene(elements, sanitizedAppState),
          ...(name?.trim() ? { name: name.trim() } : {}),
          ...(fileEncryptionKeyToSave
            ? { fileEncryptionKey: fileEncryptionKeyToSave }
            : {}),
        }),
      );

      if (fileEncryptionKey && filesToUpload.size > 0) {
        await uploadBoardFiles({
          userId: user.id,
          boardId: id,
          files: filesToUpload,
          encryptionKey: fileEncryptionKey,
        });
      }
    } catch (error) {
      if (shouldFallbackToLocal(error)) {
        const boards = getFallbackBoards();
        const index = boards.findIndex((b) => b.id === id);
        if (index >= 0) {
          boards[index] = {
            ...boards[index],
            name: name?.trim() ?? boards[index].name,
            elements,
            appState: sanitizedAppState,
            files,
            updatedAt: Date.now(),
          };
          setFallbackBoards(boards);
        }
        return;
      }
      throw error;
    }
  },

  /**
   * Renames a board without loading or re-uploading its scene data.
   */
  renameBoard: async (id: string, name: string): Promise<void> => {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }

    if (!HAS_CONVEX) {
      const boards = getFallbackBoards();
      const index = boards.findIndex((b) => b.id === id);
      if (index >= 0) {
        boards[index] = {
          ...boards[index],
          name: trimmed,
          updatedAt: Date.now(),
        };
        setFallbackBoards(boards);
      }
      return;
    }

    try {
      await requireAuth();
      const client = getConvexClient();
      if (!client) {
        throw new Error("Convex is not configured.");
      }
      await client.mutation(anyApi.boards.renameBoard, {
        boardId: id,
        name: trimmed,
      });
    } catch (error) {
      if (shouldFallbackToLocal(error)) {
        const boards = getFallbackBoards();
        const index = boards.findIndex((b) => b.id === id);
        if (index >= 0) {
          boards[index] = {
            ...boards[index],
            name: trimmed,
            updatedAt: Date.now(),
          };
          setFallbackBoards(boards);
        }
        return;
      }
      throw error;
    }
  },

  /**
   * Loads the full scene for a board (elements, appState).
   * Files are loaded from Firebase Storage when available.
   */
  loadBoard: async (id: string): Promise<Board | null> => {
    if (!HAS_CONVEX) {
      return getFallbackBoards().find((b) => b.id === id) ?? null;
    }

    try {
      const user = await requireAuth();
      const client = getConvexClient();
      if (!client) {
        throw new Error("Convex is not configured.");
      }
      const d = await client.query(anyApi.boards.getBoard, { boardId: id });
      if (!d) {
        return null;
      }
      const parsedScene = deserializeScene(d.scene ?? undefined);
      const boardId = d.id;
      const elements = parsedScene?.elements ?? [];
      const appState = parsedScene?.appState ?? sanitizeAppState({});
      const cacheKey = getBoardCacheKey(user.id, boardId);
      if (d.fileEncryptionKey) {
        boardFileKeyCache.set(cacheKey, d.fileEncryptionKey);
      }
      let files: BinaryFiles = {} as BinaryFiles;
      if (d.fileEncryptionKey) {
        const fileIds = getFileIdsFromElements(elements);
        if (fileIds.length) {
          const { loadedFiles } = await loadFilesFromFirebase(
            getBoardFilesPrefix(user.id, boardId),
            d.fileEncryptionKey,
            fileIds,
          );
          files = loadedFiles.reduce((acc, file) => {
            acc[file.id] = file;
            return acc;
          }, {} as BinaryFiles);
          if (loadedFiles.length) {
            const versionCache =
              boardFileVersionCache.get(cacheKey) ?? new Map();
            loadedFiles.forEach((file) => {
              versionCache.set(file.id, getFileVersion(file));
            });
            boardFileVersionCache.set(cacheKey, versionCache);
          }
        }
      }

      logAnalyticsEvent("board_load");

      return {
        id: boardId,
        name: d.name ?? "Untitled board",
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        elements,
        appState,
        files,
      };
    } catch (error) {
      if (shouldFallbackToLocal(error)) {
        return getFallbackBoards().find((b) => b.id === id) ?? null;
      }
      throw error;
    }
  },

  /**
   * Permanently deletes a board from Firestore.
   * Local IndexedDB files are not touched (they'll be GC'd by LocalData).
   */
  deleteBoard: async (id: string): Promise<void> => {
    if (!HAS_CONVEX) {
      setFallbackBoards(getFallbackBoards().filter((b) => b.id !== id));
      return;
    }

    try {
      await requireAuth();
      const client = getConvexClient();
      if (!client) {
        throw new Error("Convex is not configured.");
      }
      await client.mutation(anyApi.boards.deleteBoard, { boardId: id });

      logAnalyticsEvent("board_delete");
    } catch (error) {
      if (shouldFallbackToLocal(error)) {
        setFallbackBoards(getFallbackBoards().filter((b) => b.id !== id));
        return;
      }
      throw error;
    }
  },
};
