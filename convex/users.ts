import { queryGeneric } from "convex/server";

export const getViewer = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    return {
      id: identity.subject,
      name: identity.name ?? identity.email ?? "Drawboard User",
      email: identity.email ?? "",
      photoURL: identity.pictureUrl ?? undefined,
    };
  },
});
