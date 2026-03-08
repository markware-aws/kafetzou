"use client";

import {
  signIn,
  signOut,
  signUp,
  confirmSignUp,
  getCurrentUser,
  fetchAuthSession,
} from "aws-amplify/auth";

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
    // Token missing from cached session (e.g. after logout/login) — force a refresh
    const refreshed = await fetchAuthSession({ forceRefresh: true });
    return refreshed.tokens?.idToken?.toString() ?? null;
  } catch {
    return null;
  }
}
