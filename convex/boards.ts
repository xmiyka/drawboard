import { v } from "convex/values";
import { mutationGeneric, queryGeneric } from "convex/server";

export const listBoards = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject ?? null;
    if (!userId) {
      return [];
    }
    const boards = await ctx.db
      .query("boards")
      .withIndex("by_userId_updatedAt", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
    return boards.map((board) => ({
      id: board._id,
      name: board.name,
      createdAt: board.createdAt,
      updatedAt: board.updatedAt,
    }));
  },
});

export const getBoard = queryGeneric({
  args: { boardId: v.id("boards") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject ?? null;
    if (!userId) {
      return null;
    }
    const board = await ctx.db.get(args.boardId);
    if (!board || board.userId !== userId) {
      return null;
    }
    return {
      id: board._id,
      name: board.name,
      createdAt: board.createdAt,
      updatedAt: board.updatedAt,
      scene: board.scene ?? null,
      fileEncryptionKey: board.fileEncryptionKey ?? null,
    };
  },
});

export const createBoard = mutationGeneric({
  args: {
    name: v.string(),
    scene: v.string(),
    fileEncryptionKey: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject ?? null;
    if (!userId) {
      throw new Error("Not authenticated");
    }
    const now = Date.now();
    const id = await ctx.db.insert("boards", {
      userId,
      name: args.name,
      scene: args.scene,
      fileEncryptionKey: args.fileEncryptionKey,
      createdAt: now,
      updatedAt: now,
    });
    return { id };
  },
});

export const updateBoard = mutationGeneric({
  args: {
    boardId: v.id("boards"),
    name: v.optional(v.string()),
    scene: v.optional(v.string()),
    fileEncryptionKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject ?? null;
    if (!userId) {
      throw new Error("Not authenticated");
    }
    const board = await ctx.db.get(args.boardId);
    if (!board || board.userId !== userId) {
      throw new Error("Board not found");
    }
    await ctx.db.patch(args.boardId, {
      name: args.name ?? board.name,
      scene: args.scene ?? board.scene,
      fileEncryptionKey: args.fileEncryptionKey ?? board.fileEncryptionKey,
      updatedAt: Date.now(),
    });
    return { id: args.boardId };
  },
});

export const renameBoard = mutationGeneric({
  args: {
    boardId: v.id("boards"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject ?? null;
    if (!userId) {
      throw new Error("Not authenticated");
    }
    const board = await ctx.db.get(args.boardId);
    if (!board || board.userId !== userId) {
      throw new Error("Board not found");
    }
    await ctx.db.patch(args.boardId, {
      name: args.name,
      updatedAt: Date.now(),
    });
    return { id: args.boardId };
  },
});

export const deleteBoard = mutationGeneric({
  args: {
    boardId: v.id("boards"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject ?? null;
    if (!userId) {
      throw new Error("Not authenticated");
    }
    const board = await ctx.db.get(args.boardId);
    if (!board || board.userId !== userId) {
      throw new Error("Board not found");
    }
    await ctx.db.delete(args.boardId);
    return { id: args.boardId };
  },
});
