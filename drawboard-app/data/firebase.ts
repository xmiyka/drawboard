/**
 * Collab-room Firebase helpers.
 *
 * Handles encrypted scene persistence (Firestore) and binary file storage
 * (Storage) for real-time collaboration rooms.  All Firebase service access
 * goes through the shared singleton in ./firebaseApp so the whole app uses
 * a single Firebase app instance.
 */

import { reconcileElements } from "@drawboard/drawboard";
import { MIME_TYPES, toBrandedType } from "@drawboard/common";
import { decompressData } from "@drawboard/drawboard/data/encode";
import { encryptData, decryptData } from "@drawboard/drawboard/data/encryption";
import { restoreElements } from "@drawboard/drawboard/data/restore";
import { getSceneVersion } from "@drawboard/element";
import { anyApi } from "convex/server";

import { FILE_CACHE_MAX_AGE_SEC } from "../app_constants";

import { getConvexClient } from "./firebaseApp";

import { getSyncableElements } from ".";

import type { RemoteDrawboardElement } from "@drawboard/drawboard/data/reconcile";
import type {
  DrawboardElement,
  FileId,
  OrderedDrawboardElement,
} from "@drawboard/element/types";
import type {
  AppState,
  BinaryFileData,
  BinaryFileMetadata,
  DataURL,
} from "@drawboard/drawboard/types";
import type { SyncableDrawboardElement } from ".";
import type Portal from "../collab/Portal";
import type { Socket } from "socket.io-client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FirebaseStoredScene = {
  sceneVersion: number;
  iv: string;
  ciphertext: string;
};

// ---------------------------------------------------------------------------
// Scene version cache (per socket instance)
// ---------------------------------------------------------------------------

class FirebaseSceneVersionCache {
  private static cache = new WeakMap<Socket, number>();

  static get = (socket: Socket) => FirebaseSceneVersionCache.cache.get(socket);

  static set = (
    socket: Socket,
    elements: readonly SyncableDrawboardElement[],
  ) => {
    FirebaseSceneVersionCache.cache.set(socket, getSceneVersion(elements));
  };
}

// ---------------------------------------------------------------------------
// Encryption helpers
// ---------------------------------------------------------------------------

const encryptElements = async (
  key: string,
  elements: readonly DrawboardElement[],
): Promise<{ ciphertext: ArrayBuffer; iv: Uint8Array }> => {
  const encoded = new TextEncoder().encode(JSON.stringify(elements));
  const { encryptedBuffer, iv } = await encryptData(key, encoded);
  return { ciphertext: encryptedBuffer, iv };
};

const decryptElements = async (
  data: FirebaseStoredScene,
  roomKey: string,
): Promise<readonly DrawboardElement[]> => {
  const ciphertext = fromBase64(data.ciphertext);
  const iv = fromBase64(data.iv);
  const decrypted = await decryptData(iv, ciphertext, roomKey);
  return JSON.parse(new TextDecoder("utf-8").decode(new Uint8Array(decrypted)));
};

const createFirebaseSceneDocument = async (
  elements: readonly SyncableDrawboardElement[],
  roomKey: string,
): Promise<FirebaseStoredScene> => {
  const sceneVersion = getSceneVersion(elements);
  const { ciphertext, iv } = await encryptElements(roomKey, elements);
  return {
    sceneVersion,
    ciphertext: toBase64(new Uint8Array(ciphertext)),
    iv: toBase64(iv),
  };
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const isSavedToFirebase = (
  portal: Portal,
  elements: readonly DrawboardElement[],
): boolean => {
  if (portal.socket && portal.roomId && portal.roomKey) {
    return (
      FirebaseSceneVersionCache.get(portal.socket) === getSceneVersion(elements)
    );
  }
  // No active room — treat as saved so we don't block page unload.
  return true;
};

export const saveFilesToFirebase = async ({
  prefix,
  files,
}: {
  prefix: string;
  files: { id: FileId; buffer: Uint8Array }[];
}) => {
  const client = getConvexClient();
  if (!client) {
    return { savedFiles: [] as FileId[], erroredFiles: files.map((f) => f.id) };
  }

  const savedFiles: FileId[] = [];
  const erroredFiles: FileId[] = [];
  const entries: { prefix: string; fileId: string; storageId: string }[] = [];

  await Promise.all(
    files.map(async ({ id, buffer }) => {
      try {
        const { url } = await client.mutation(
          anyApi.files.generateUploadUrl,
          {},
        );
        const body = (
          buffer.byteOffset === 0 &&
          buffer.byteLength === buffer.buffer.byteLength
            ? buffer.buffer
            : buffer.buffer.slice(
                buffer.byteOffset,
                buffer.byteOffset + buffer.byteLength,
              )
        ) as ArrayBuffer;
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
            "Cache-Control": `public, max-age=${FILE_CACHE_MAX_AGE_SEC}`,
          },
          body,
        });
        if (!response.ok) {
          throw new Error(`Upload failed: ${response.status}`);
        }
        const json = (await response.json()) as { storageId?: string };
        if (!json.storageId) {
          throw new Error("Upload failed: missing storageId");
        }
        entries.push({ prefix, fileId: id, storageId: json.storageId });
        savedFiles.push(id);
      } catch {
        erroredFiles.push(id);
      }
    }),
  );

  if (entries.length) {
    await client.mutation(anyApi.files.saveFileEntries, { entries });
  }

  return { savedFiles, erroredFiles };
};

export const saveToFirebase = async (
  portal: Portal,
  elements: readonly SyncableDrawboardElement[],
  appState: AppState,
) => {
  const { roomId, roomKey, socket } = portal;
  if (!roomId || !roomKey || !socket || isSavedToFirebase(portal, elements)) {
    return null;
  }

  const client = getConvexClient();
  if (!client) {
    return null;
  }

  const storedScene = await client.query(anyApi.collab.getScene, { roomId });
  let storedElements = elements;
  if (storedScene) {
    const prevElements = getSyncableElements(
      restoreElements(await decryptElements(storedScene, roomKey), null),
    );
    storedElements = getSyncableElements(
      reconcileElements(
        elements,
        prevElements as OrderedDrawboardElement[] as RemoteDrawboardElement[],
        appState,
      ),
    );
  }
  const sceneDoc = await createFirebaseSceneDocument(storedElements, roomKey);
  await client.mutation(anyApi.collab.saveScene, {
    roomId,
    sceneVersion: sceneDoc.sceneVersion,
    iv: sceneDoc.iv,
    ciphertext: sceneDoc.ciphertext,
  });

  FirebaseSceneVersionCache.set(socket, storedElements);

  return toBrandedType<RemoteDrawboardElement[]>([...storedElements]);
};

export const loadFromFirebase = async (
  roomId: string,
  roomKey: string,
  socket: Socket | null,
): Promise<readonly SyncableDrawboardElement[] | null> => {
  const client = getConvexClient();
  if (!client) {
    return null;
  }

  const stored = await client.query(anyApi.collab.getScene, { roomId });
  if (!stored) {
    return null;
  }

  const elements = getSyncableElements(
    restoreElements(await decryptElements(stored, roomKey), null, {
      deleteInvisibleElements: true,
    }),
  );

  if (socket) {
    FirebaseSceneVersionCache.set(socket, elements);
  }

  return elements;
};

export const loadFilesFromFirebase = async (
  prefix: string,
  decryptionKey: string,
  filesIds: readonly FileId[],
) => {
  const client = getConvexClient();
  if (!client) {
    return { loadedFiles: [], erroredFiles: new Map<FileId, true>() };
  }

  const loadedFiles: BinaryFileData[] = [];
  const erroredFiles = new Map<FileId, true>();

  const uniqueIds = [...new Set(filesIds)];
  const results = await client.query(anyApi.files.getFileUrls, {
    prefix,
    fileIds: uniqueIds.map((id) => id.toString()),
  });

  await Promise.all(
    results.map(async ({ id, url }: { id: string; url: string | null }) => {
      try {
        if (!url) {
          erroredFiles.set(id as FileId, true);
          return;
        }
        const response = await fetch(url);
        if (response.status >= 400) {
          erroredFiles.set(id as FileId, true);
          return;
        }

        const arrayBuffer = await response.arrayBuffer();
        const { data, metadata } = await decompressData<BinaryFileMetadata>(
          new Uint8Array(arrayBuffer),
          { decryptionKey },
        );

        loadedFiles.push({
          mimeType: metadata.mimeType ?? MIME_TYPES.binary,
          id: id as FileId,
          dataURL: new TextDecoder().decode(data) as DataURL,
          created: metadata?.created ?? Date.now(),
          lastRetrieved: Date.now(),
          version: metadata?.version ?? 1,
        });
      } catch (error) {
        erroredFiles.set(id as FileId, true);
        console.error("[loadFilesFromFirebase]", error);
      }
    }),
  );

  return { loadedFiles, erroredFiles };
};

const toBase64 = (bytes: Uint8Array) =>
  btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""));

const fromBase64 = (base64: string) =>
  Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
