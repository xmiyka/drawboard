import { v } from "convex/values";
import { mutationGeneric, queryGeneric } from "convex/server";

export const generateUploadUrl = mutationGeneric({
  args: {},
  handler: async (ctx) => {
    const url = await ctx.storage.generateUploadUrl();
    return { url };
  },
});

export const saveFileEntries = mutationGeneric({
  args: {
    entries: v.array(
      v.object({
        prefix: v.string(),
        fileId: v.string(),
        storageId: v.id("_storage"),
      }),
    ),
  },
  handler: async (ctx, args) => {
    for (const entry of args.entries) {
      const existing = await ctx.db
        .query("files")
        .withIndex("by_prefix_fileId", (q: any) =>
          q.eq("prefix", entry.prefix).eq("fileId", entry.fileId),
        )
        .unique();
      if (existing) {
        await ctx.db.patch(existing._id, {
          storageId: entry.storageId,
        });
      } else {
        await ctx.db.insert("files", {
          prefix: entry.prefix,
          fileId: entry.fileId,
          storageId: entry.storageId,
          createdAt: Date.now(),
        });
      }
    }
    return { ok: true };
  },
});

export const getFileUrls = queryGeneric({
  args: {
    prefix: v.string(),
    fileIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const results: { id: string; url: string | null }[] = [];
    for (const fileId of args.fileIds) {
      const entry = await ctx.db
        .query("files")
        .withIndex("by_prefix_fileId", (q: any) =>
          q.eq("prefix", args.prefix).eq("fileId", fileId),
        )
        .unique();
      if (!entry) {
        results.push({ id: fileId, url: null });
        continue;
      }
      const url = await ctx.storage.getUrl(entry.storageId);
      results.push({ id: fileId, url });
    }
    return results;
  },
});

export const saveMigrationScene = mutationGeneric({
  args: {
    sceneId: v.string(),
    name: v.string(),
    version: v.number(),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("migrationScenes")
      .withIndex("by_sceneId", (q: any) => q.eq("sceneId", args.sceneId))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        version: args.version,
        createdAt: args.createdAt,
      });
    } else {
      await ctx.db.insert("migrationScenes", {
        sceneId: args.sceneId,
        name: args.name,
        version: args.version,
        createdAt: args.createdAt,
      });
    }
    return { ok: true };
  },
});
