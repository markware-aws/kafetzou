import { Amplify } from 'aws-amplify';
import { cognitoUserPoolsTokenProvider } from 'aws-amplify/auth/cognito';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

export function configureAmplify() {
  const extra = Constants.expoConfig?.extra ?? {};

  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: extra.cognitoUserPoolId as string,
        userPoolClientId: extra.cognitoClientId as string,
        loginWith: {
          email: true,
          oauth: {
            domain: extra.cognitoDomain as string,
            scopes: ['email', 'openid', 'profile'],
            redirectSignIn: ['kafetzou://'],
            redirectSignOut: ['kafetzou://login'],
            responseType: 'code',
          },
        },
      },
    },
  });

  // Use AsyncStorage so tokens persist across app restarts
  cognitoUserPoolsTokenProvider.setKeyValueStorage(AsyncStorage);
}
