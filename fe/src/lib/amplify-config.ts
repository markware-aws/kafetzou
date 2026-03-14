import { Amplify } from "aws-amplify";

export function configureAmplify() {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
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
            redirectSignIn: [appUrl],
            redirectSignOut: [`${appUrl}/login`],
            responseType: "code",
          },
        },
      },
    },
  });
}
