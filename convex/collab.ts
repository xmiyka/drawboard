import { v } from "convex/values";
import { mutationGeneric, queryGeneric } from "convex/server";

export const getScene = queryGeneric({
  args: { roomId: v.string() },
  handler: async (ctx, args) => {
    const scene = await ctx.db
      .query("collabScenes")
      .withIndex("by_roomId", (q) => q.eq("roomId", args.roomId))
      .unique();
    if (!scene) {
      return null;
    }
    return {
      roomId: scene.roomId,
      sceneVersion: scene.sceneVersion,
      iv: scene.iv,
      ciphertext: scene.ciphertext,
    };
  },
});

export const saveScene = mutationGeneric({
  args: {
    roomId: v.string(),
    sceneVersion: v.number(),
    iv: v.string(),
    ciphertext: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("collabScenes")
      .withIndex("by_roomId", (q) => q.eq("roomId", args.roomId))
      .unique();
    if (!existing) {
      const id = await ctx.db.insert("collabScenes", {
        roomId: args.roomId,
        sceneVersion: args.sceneVersion,
        iv: args.iv,
        ciphertext: args.ciphertext,
        updatedAt: Date.now(),
      });
      return { id };
    }
    if (args.sceneVersion >= existing.sceneVersion) {
      await ctx.db.patch(existing._id, {
        sceneVersion: args.sceneVersion,
        iv: args.iv,
        ciphertext: args.ciphertext,
        updatedAt: Date.now(),
      });
    }
    return { id: existing._id };
  },
});
