import React from "react";
import { nanoid } from "nanoid";
import { anyApi } from "convex/server";

import { trackEvent } from "@drawboard/drawboard/analytics";
import { Card } from "@drawboard/drawboard/components/Card";
import { DrawboardLogo } from "@drawboard/drawboard/components/DrawboardLogo";
import { ToolButton } from "@drawboard/drawboard/components/ToolButton";
import { MIME_TYPES, getFrame } from "@drawboard/common";
import {
  encryptData,
  generateEncryptionKey,
} from "@drawboard/drawboard/data/encryption";
import { serializeAsJSON } from "@drawboard/drawboard/data/json";
import { isInitializedImageElement } from "@drawboard/element";
import { useI18n } from "@drawboard/drawboard/i18n";

import { FILE_UPLOAD_MAX_BYTES } from "../app_constants";
import { encodeFilesForUpload } from "../data/FileManager";
import { saveFilesToFirebase } from "../data/firebase";
import { getConvexClient } from "../data/firebaseApp";

import type {
  AppState,
  BinaryFileData,
  BinaryFiles,
} from "@drawboard/drawboard/types";
import type {
  FileId,
  NonDeletedDrawboardElement,
} from "@drawboard/element/types";

export const exportToDrawboardPlus = async (
  elements: readonly NonDeletedDrawboardElement[],
  appState: Partial<AppState>,
  files: BinaryFiles,
  name: string,
) => {
  const client = getConvexClient();
  if (!client) {
    throw new Error("Convex is not configured.");
  }

  const id = `${nanoid(12)}`;

  const encryptionKey = (await generateEncryptionKey())!;
  const encryptedData = await encryptData(
    encryptionKey,
    serializeAsJSON(elements, appState, files, "database"),
  );

  const blob = new Blob(
    [encryptedData.iv, new Uint8Array(encryptedData.encryptedBuffer)],
    {
      type: MIME_TYPES.binary,
    },
  );

  const createdAt = Date.now();
  await saveFilesToFirebase({
    prefix: "/migrations/scenes",
    files: [
      {
        id: id as FileId,
        buffer: new Uint8Array(await blob.arrayBuffer()),
      },
    ],
  });
  await client.mutation(anyApi.files.saveMigrationScene, {
    sceneId: id,
    name,
    version: 2,
    createdAt,
  });

  const filesMap = new Map<FileId, BinaryFileData>();
  for (const element of elements) {
    if (isInitializedImageElement(element) && files[element.fileId]) {
      filesMap.set(element.fileId, files[element.fileId]);
    }
  }

  if (filesMap.size) {
    const filesToUpload = await encodeFilesForUpload({
      files: filesMap,
      encryptionKey,
      maxBytes: FILE_UPLOAD_MAX_BYTES,
    });

    await saveFilesToFirebase({
      prefix: `/migrations/files/scenes/${id}`,
      files: filesToUpload,
    });
  }

  window.open(
    `${
      import.meta.env.VITE_APP_PLUS_APP
    }/import?drawboard=${id},${encryptionKey}`,
  );
};

export const ExportToDrawboardPlus: React.FC<{
  elements: readonly NonDeletedDrawboardElement[];
  appState: Partial<AppState>;
  files: BinaryFiles;
  name: string;
  onError: (error: Error) => void;
  onSuccess: () => void;
}> = ({ elements, appState, files, name, onError, onSuccess }) => {
  const { t } = useI18n();
  return (
    <Card color="primary">
      <div className="Card-icon">
        <DrawboardLogo
          style={{
            [`--color-logo-icon` as any]: "#fff",
            width: "2.8rem",
            height: "2.8rem",
          }}
        />
      </div>
      <h2>Drawboard+</h2>
      <div className="Card-details">
        {t("exportDialog.drawboardplus_description")}
      </div>
      <ToolButton
        className="Card-button"
        type="button"
        title={t("exportDialog.drawboardplus_button")}
        aria-label={t("exportDialog.drawboardplus_button")}
        showAriaLabel={true}
        onClick={async () => {
          try {
            trackEvent("export", "eplus", `ui (${getFrame()})`);
            await exportToDrawboardPlus(elements, appState, files, name);
            onSuccess();
          } catch (error: any) {
            console.error(error);
            if (error.name !== "AbortError") {
              onError(new Error(t("exportDialog.drawboardplus_exportError")));
            }
          }
        }}
      />
    </Card>
  );
};
