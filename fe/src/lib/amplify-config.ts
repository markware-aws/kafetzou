import { Amplify } from "aws-amplify";

export function configureAmplify() {
  // Use the actual origin the user is on so Amplify's origin check always passes.
  // Falls back to env var during SSR (no window).
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!,
        userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
        loginWith: {
          email: true,
          oauth: {
            domain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN!,
            scopes: ["email", "openid", "profile"],
            redirectSignIn: [origin],
            redirectSignOut: [`${origin}/login`],
            responseType: "code",
          },
        },
      },
    },
  });
}
