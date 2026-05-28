import { ConvexReactClient } from "convex/react";

export const CONVEX_URL =
  (import.meta.env.VITE_CONVEX_URL as string | undefined) ?? "";

export const HAS_CONVEX = Boolean(CONVEX_URL);

let _client: ConvexReactClient | null = null;

export const getConvexClient = (): ConvexReactClient | null => {
  if (!HAS_CONVEX) {
    return null;
  }
  if (!_client) {
    _client = new ConvexReactClient(CONVEX_URL);
  }
  return _client;
};

export const logAnalyticsEvent = (
  _name: string,
  _params?: Record<string, string | number | boolean>,
): void => {};
