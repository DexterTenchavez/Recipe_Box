import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { useEffect, useState } from 'react';
import { FirebaseService } from './FirebaseService';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { makeRedirectUri } from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

export function useGoogleSignIn() {
  const [userToken, setUserToken] = useState(null);

  const redirectUri = makeRedirectUri({
    useProxy: Constants.appOwnership === 'expo',
    native: 'recipebook://redirect',
  });

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: Platform.select({
      android:
        Constants.appOwnership === 'expo'
          ? '157942699599-miao9gillg9t60cbog343vgtav41kcah.apps.googleusercontent.com' // Expo Go
          : '157942699599-drab70jm7k4j73um3d1o2h88i0n2ma9p.apps.googleusercontent.com', // standalone Android
      ios:
        Constants.appOwnership === 'expo'
          ? '157942699599-miao9gillg9t60cbog343vgtav41kcah.apps.googleusercontent.com' // Expo Go
          : '157942699599-ios-standalone-client-id.apps.googleusercontent.com', // standalone iOS
      web: '157942699599-miao9gillg9t60cbog343vgtav41kcah.apps.googleusercontent.com',
    }),
    redirectUri,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      FirebaseService.loginWithGoogle(id_token)
        .then(user => setUserToken(user))
        .catch(err => console.error('*** Google sign-in FAILED (Firebase error):', err));
    }
  }, [response]);

  return { request, promptAsync, userToken };
}