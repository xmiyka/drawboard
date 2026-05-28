import React, { useEffect, useState, useCallback, useRef } from "react";
import clsx from "clsx";

import {
  restoreAppState,
  restoreElements,
} from "@drawboard/drawboard/data/restore";
import { Dialog } from "@drawboard/drawboard/components/Dialog";
import { Button } from "@drawboard/drawboard/components/Button";
import { TextField } from "@drawboard/drawboard/components/TextField";
import { CaptureUpdateAction } from "@drawboard/drawboard";

import {
  LoadIcon,
  PlusIcon,
  TrashIcon,
  checkIcon,
  pencilIcon,
} from "@drawboard/drawboard/components/icons";

import { CloudStorage } from "../data/CloudStorage";
import { useAtom, userBoardsAtom } from "../app-jotai";

import "./BoardListDialog.scss";

import type {
  DrawboardImperativeAPI,
  AppState,
  BinaryFiles,
} from "@drawboard/drawboard/types";

interface BoardListDialogProps {
  onClose: () => void;
  drawboardAPI: DrawboardImperativeAPI;
  activeBoardId: string | null;
  onActiveBoardChange: (boardId: string | null) => void;
}

export const BoardListDialog = ({
  onClose,
  drawboardAPI,
  activeBoardId,
  onActiveBoardChange,
}: BoardListDialogProps) => {
  const [boards, setBoards] = useAtom(userBoardsAtom);
  const [loading, setLoading] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");

  // Inline rename state
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Inline delete confirmation state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refreshBoards = useCallback(async () => {
    setLoading(true);
    try {
      const fetchedBoards = await CloudStorage.getBoards();
      setBoards(fetchedBoards);
    } finally {
      setLoading(false);
    }
  }, [setBoards]);

  useEffect(() => {
    refreshBoards();
  }, [refreshBoards]);

  // Focus the rename input when it appears
  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  const formatUpdatedAt = (timestamp: number) =>
    new Date(timestamp).toLocaleString([], {
      dateStyle: "medium",
      timeStyle: "short",
    });

  const handleSaveBoard = async () => {
    if (!newBoardName.trim()) {
      return;
    }
    setLoading(true);
    try {
      const savedBoard = await CloudStorage.saveBoard(
        newBoardName,
        drawboardAPI.getSceneElements(),
        drawboardAPI.getAppState(),
        drawboardAPI.getFiles(),
      );
      setNewBoardName("");
      onActiveBoardChange(savedBoard.id);
      await refreshBoards();
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEmptyBoard = async () => {
    setLoading(true);
    try {
      const baseAppState = drawboardAPI.getAppState();
      const savedBoard = await CloudStorage.saveBoard(
        "Untitled board",
        [],
        baseAppState,
        {} as BinaryFiles,
      );
      drawboardAPI.updateScene({
        elements: [],
        appState: {
          ...(baseAppState as AppState),
          isLoading: false,
        },
        captureUpdate: CaptureUpdateAction.IMMEDIATELY,
      });
      onActiveBoardChange(savedBoard.id);
      await refreshBoards();
    } finally {
      setLoading(false);
    }
  };

  const handleLoadBoard = async (boardId: string) => {
    setLoading(true);
    try {
      const board = await CloudStorage.loadBoard(boardId);
      if (board) {
        const restoredElements = restoreElements(board.elements, null, {
          repairBindings: true,
          deleteInvisibleElements: true,
        });
        const restoredAppState = restoreAppState(
          board.appState,
          drawboardAPI.getAppState(),
        );

        drawboardAPI.updateScene({
          elements: restoredElements,
          appState: {
            ...(restoredAppState as AppState),
            isLoading: false,
          },
          captureUpdate: CaptureUpdateAction.IMMEDIATELY,
        });
        drawboardAPI.addFiles(Object.values(board.files || {}));
        onActiveBoardChange(board.id);
        onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBoard = async (boardId: string) => {
    setDeletingId(null);
    setLoading(true);
    try {
      await CloudStorage.deleteBoard(boardId);
      if (activeBoardId === boardId) {
        onActiveBoardChange(null);
      }
      await refreshBoards();
    } finally {
      setLoading(false);
    }
  };

  const startRename = (boardId: string, currentName: string) => {
    setDeletingId(null);
    setRenamingId(boardId);
    setRenameValue(currentName);
  };

  const commitRename = async () => {
    if (!renamingId) {
      return;
    }
    const id = renamingId;
    const name = renameValue.trim();
    setRenamingId(null);
    if (!name) {
      return;
    }
    setLoading(true);
    try {
      await CloudStorage.renameBoard(id, name);
      await refreshBoards();
    } finally {
      setLoading(false);
    }
  };

  const cancelRename = () => {
    setRenamingId(null);
    setRenameValue("");
  };

  return (
    <Dialog
      onCloseRequest={onClose}
      title={false}
      className="board-list-dialog"
      size="wide"
    >
      <div className="BoardListDialog">
        <div className="BoardListDialog__header">
          <h3 className="BoardListDialog__title">My Boards</h3>
          <p className="BoardListDialog__subtitle">
            Save your current canvas and reopen it anytime. Ctrl+S auto-saves
            the active board.
          </p>
        </div>

        <div className="BoardListDialog__createRow">
          <TextField
            value={newBoardName}
            onChange={setNewBoardName}
            placeholder="New board name"
            label="Create board"
            fullWidth
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void handleSaveBoard();
              }
            }}
          />
          <Button
            onSelect={handleSaveBoard}
            className="primary BoardListDialog__saveButton"
            style={{ height: "2.625rem", alignSelf: "flex-end" }}
          >
            {PlusIcon} Save current
          </Button>
        </div>

        <div className="BoardListDialog__sectionHeader">
          <div className="BoardListDialog__sectionTitle">
            <h3>Boards</h3>
            <span className="BoardListDialog__count">{boards.length}</span>
          </div>
          <Button
            onSelect={() => void handleCreateEmptyBoard()}
            className="primary BoardListDialog__newEmpty"
            disabled={loading}
            title="Create a new empty board"
          >
            {PlusIcon} New empty
          </Button>
        </div>

        {loading && (
          <div className="BoardListDialog__state">Loading boards...</div>
        )}

        {!loading && boards.length > 0 && (
          <ul className="BoardListDialog__grid">
            {boards.map((board) => {
              const isActive = activeBoardId === board.id;
              const isRenaming = renamingId === board.id;
              const isDeleting = deletingId === board.id;

              return (
                <li
                  key={board.id}
                  className={clsx("BoardListDialog__card", {
                    "is-active": isActive,
                  })}
                >
                  {isRenaming ? (
                    /* ---- Inline rename form ---- */
                    <div className="BoardListDialog__renameForm">
                      <input
                        ref={renameInputRef}
                        className="BoardListDialog__renameInput"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            void commitRename();
                          }
                          if (e.key === "Escape") {
                            cancelRename();
                          }
                        }}
                        placeholder="Board name"
                        aria-label="Rename board"
                      />
                      <div className="BoardListDialog__renameActions">
                        <Button
                          onSelect={() => void commitRename()}
                          className="primary BoardListDialog__renameConfirm"
                        >
                          Save
                        </Button>
                        <Button onSelect={cancelRename}>Cancel</Button>
                      </div>
                    </div>
                  ) : isDeleting ? (
                    /* ---- Inline delete confirmation ---- */
                    <div className="BoardListDialog__deleteConfirm">
                      <p className="BoardListDialog__deleteMsg">
                        Delete <strong>{board.name}</strong>?
                      </p>
                      <div className="BoardListDialog__deleteActions">
                        <Button
                          onSelect={() => void handleDeleteBoard(board.id)}
                          className="danger BoardListDialog__deleteDanger"
                        >
                          {TrashIcon} Delete
                        </Button>
                        <Button onSelect={() => setDeletingId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* ---- Normal card view ---- */
                    <>
                      <button
                        type="button"
                        className="BoardListDialog__itemMain"
                        onClick={() => void handleLoadBoard(board.id)}
                        title={`Load ${board.name}`}
                      >
                        <div className="BoardListDialog__itemTitleRow">
                          <span className="BoardListDialog__itemTitle">
                            {board.name}
                          </span>
                          {isActive && (
                            <span className="BoardListDialog__badge">
                              {checkIcon} Active
                            </span>
                          )}
                        </div>
                        <div className="BoardListDialog__itemMeta">
                          Updated {formatUpdatedAt(board.updatedAt)}
                        </div>
                      </button>

                      <div className="BoardListDialog__actions">
                        <Button
                          onSelect={() => handleLoadBoard(board.id)}
                          title="Load board"
                          className="BoardListDialog__action BoardListDialog__action--load"
                        >
                          {LoadIcon}
                        </Button>
                        <Button
                          onSelect={() => startRename(board.id, board.name)}
                          title="Rename board"
                          className="BoardListDialog__action"
                        >
                          {pencilIcon}
                        </Button>
                        <Button
                          onSelect={() => {
                            setRenamingId(null);
                            setDeletingId(board.id);
                          }}
                          title="Delete board"
                          className="BoardListDialog__action BoardListDialog__action--danger"
                        >
                          {TrashIcon}
                        </Button>
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {!loading && boards.length === 0 && (
          <div className="BoardListDialog__empty">
            <p>No boards yet.</p>
            <small>Create one above to get started.</small>
          </div>
        )}
      </div>
    </Dialog>
  );
};
