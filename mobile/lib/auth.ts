import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const KEYS = {
  idToken: 'auth.idToken',
  accessToken: 'auth.accessToken',
  refreshToken: 'auth.refreshToken',
};

function getConfig() {
  const extra = Constants.expoConfig?.extra ?? {};
  const clientId = extra.cognitoClientId as string;
  const userPoolId = extra.cognitoUserPoolId as string;
  const region = userPoolId.split('_')[0];
  const endpoint = `https://cognito-idp.${region}.amazonaws.com/`;
  return { clientId, userPoolId, region, endpoint };
}

async function cognitoPost(target: string, body: object) {
  const { endpoint } = getConfig();
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'X-Amz-Target': `AWSCognitoIdentityProviderService.${target}`,
      'Content-Type': 'application/x-amz-json-1.1',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.__type || 'Request failed');
  return data;
}

async function storeTokens(result: { IdToken: string; AccessToken: string; RefreshToken?: string }) {
  await AsyncStorage.setItem(KEYS.idToken, result.IdToken);
  await AsyncStorage.setItem(KEYS.accessToken, result.AccessToken);
  if (result.RefreshToken) await AsyncStorage.setItem(KEYS.refreshToken, result.RefreshToken);
}

function parseJwt(token: string): Record<string, any> {
  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(atob(base64));
}

async function refreshTokens(): Promise<boolean> {
  try {
    const { clientId } = getConfig();
    const refreshToken = await AsyncStorage.getItem(KEYS.refreshToken);
    if (!refreshToken) return false;
    const data = await cognitoPost('InitiateAuth', {
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      AuthParameters: { REFRESH_TOKEN: refreshToken },
      ClientId: clientId,
    });
    await storeTokens(data.AuthenticationResult);
    return true;
  } catch {
    return false;
  }
}

export async function login(email: string, password: string) {
  const { clientId } = getConfig();
  const data = await cognitoPost('InitiateAuth', {
    AuthFlow: 'USER_PASSWORD_AUTH',
    AuthParameters: { USERNAME: email, PASSWORD: password },
    ClientId: clientId,
  });
  await storeTokens(data.AuthenticationResult);
}

export async function logout() {
  await AsyncStorage.multiRemove([KEYS.idToken, KEYS.accessToken, KEYS.refreshToken]);
}

export async function register(email: string, password: string) {
  const { clientId } = getConfig();
  await cognitoPost('SignUp', {
    ClientId: clientId,
    Username: email,
    Password: password,
    UserAttributes: [{ Name: 'email', Value: email }],
  });
}

export async function confirmRegistration(email: string, code: string, password?: string) {
  const { clientId } = getConfig();
  await cognitoPost('ConfirmSignUp', {
    ClientId: clientId,
    Username: email,
    ConfirmationCode: code,
  });
  if (password) await login(email, password);
}

export async function forgotPassword(email: string) {
  const { clientId } = getConfig();
  await cognitoPost('ForgotPassword', {
    ClientId: clientId,
    Username: email,
  });
}

export async function confirmForgotPassword(email: string, code: string, newPassword: string) {
  const { clientId } = getConfig();
  await cognitoPost('ConfirmForgotPassword', {
    ClientId: clientId,
    Username: email,
    ConfirmationCode: code,
    Password: newPassword,
  });
}

export async function getUser(): Promise<{ username: string } | null> {
  try {
    const token = await AsyncStorage.getItem(KEYS.idToken);
    if (!token) return null;
    const payload = parseJwt(token);
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      if (!(await refreshTokens())) return null;
      const refreshed = await AsyncStorage.getItem(KEYS.idToken);
      if (!refreshed) return null;
      const p = parseJwt(refreshed);
      return { username: p.email || p['cognito:username'] };
    }
    return { username: payload.email || payload['cognito:username'] };
  } catch {
    return null;
  }
}

export async function getIdToken(): Promise<string | null> {
  try {
    const token = await AsyncStorage.getItem(KEYS.idToken);
    if (!token) return null;
    const payload = parseJwt(token);
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      if (!(await refreshTokens())) return null;
      return AsyncStorage.getItem(KEYS.idToken);
    }
    return token;
  } catch {
    return null;
  }
}

// Google OAuth — requires native build (Amplify handles the redirect flow)
export async function loginWithGoogle() {
  const { signInWithRedirect } = await import('aws-amplify/auth');
  return signInWithRedirect({ provider: 'Google' });
}
