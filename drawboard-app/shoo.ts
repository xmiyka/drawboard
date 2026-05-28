import { createShooConvexAuth, useShooAuth } from "@shoojs/react";

export const shooOptions = {
  callbackPath: "/",
  fallbackPath: "/",
};

export const { useAuth, signIn, signOut } = createShooConvexAuth(shooOptions);

export const ShooCallbackHandler = () => {
  useShooAuth({ ...shooOptions, autoHandleCallback: true });
  return null;
};
