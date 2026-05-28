import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
export default defineSchema({
  boards: defineTable({
    userId: v.string(),
    name: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    scene: v.optional(v.string()),
    fileEncryptionKey: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_updatedAt", ["userId", "updatedAt"]),
  collabScenes: defineTable({
    roomId: v.string(),
    sceneVersion: v.number(),
    iv: v.string(),
    ciphertext: v.string(),
    updatedAt: v.number(),
  }).index("by_roomId", ["roomId"]),
  files: defineTable({
    prefix: v.string(),
    fileId: v.string(),
    storageId: v.id("_storage"),
    createdAt: v.number(),
  }).index("by_prefix_fileId", ["prefix", "fileId"]),
  migrationScenes: defineTable({
    sceneId: v.string(),
    name: v.string(),
    version: v.number(),
    createdAt: v.number(),
  }).index("by_sceneId", ["sceneId"]),
});
