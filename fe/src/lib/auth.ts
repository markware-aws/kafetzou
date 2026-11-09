"use client";

import {
  signIn,
  signOut,
  signUp,
  confirmSignUp,
  resendSignUpCode,
  getCurrentUser,
  fetchAuthSession,
  resetPassword,
  confirmResetPassword,
  signInWithRedirect,
} from "aws-amplify/auth";
import { safeReturnTo } from "@/lib/return-to";

export async function login(email: string, password: string) {
  return signIn({ username: email, password });
}

export async function logout() {
  return signOut();
}

export async function register(email: string, password: string) {
  return signUp({ username: email, password, options: { userAttributes: { email } } });
}

export async function confirmRegistration(email: string, code: string) {
  return confirmSignUp({ username: email, confirmationCode: code });
}

export async function resendRegistrationCode(email: string) {
  return resendSignUpCode({ username: email });
}

/** `returnTo` comes back after the redirect as the `customOAuthState` Hub event (_app.tsx). */
export async function loginWithGoogle(returnTo = "/") {
  return signInWithRedirect({
    provider: "Google",
    customState: safeReturnTo(returnTo),
  });
}

export async function forgotPassword(email: string) {
  return resetPassword({ username: email });
}

export async function confirmForgotPassword(email: string, code: string, newPassword: string) {
  return confirmResetPassword({ username: email, confirmationCode: code, newPassword });
}

export async function getUser() {
  try {
    return await getCurrentUser();
  } catch {
    return null;
  }
}

export async function getIdToken(): Promise<string | null> {
  try {
    const session = await fetchAuthSession();
    const token = session.tokens?.idToken?.toString() ?? null;
    if (token) return token;
    const refreshed = await fetchAuthSession({ forceRefresh: true });
    return refreshed.tokens?.idToken?.toString() ?? null;
  } catch {
    return null;
  }
}
