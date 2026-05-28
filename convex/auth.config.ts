const appOrigin = process.env.SHOO_APP_ORIGIN ?? process.env.APP_ORIGIN;
const applicationID = appOrigin ? `origin:${appOrigin}` : undefined;

export default {
  providers: [
    {
      type: "customJwt",
      issuer: "https://shoo.dev",
      jwks: "https://shoo.dev/.well-known/jwks.json",
      algorithm: "ES256",
      ...(applicationID ? { applicationID } : {}),
    },
  ],
};
