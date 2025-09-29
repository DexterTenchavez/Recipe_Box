import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { useEffect, useState } from 'react';
import { FirebaseService } from './FirebaseService';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

WebBrowser.maybeCompleteAuthSession();

export function useGoogleSignIn() {
  const [userToken, setUserToken] = useState(null);

// In your useGoogleSignIn.js file:

const redirectUri = Platform.select({
  android:
    Constants.appOwnership === 'expo'
      ? 'https://auth.expo.io/@dextertenchavez/Recipe-Book' // MUST be 'Recipe-Book'
      : 'recipebook://redirect',                             // MUST be 'recipebook://redirect'
  web: 'https://auth.expo.io/@dextertenchavez/Recipe-Book',  // MUST be 'Recipe-Book'
});
// ...



  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: Platform.select({
      android:
        Constants.appOwnership === 'expo'
          ? '157942699599-miao9gillg9t60cbog343vgtav41kcah.apps.googleusercontent.com' // Web client ID for Expo Go
          : '157942699599-drab70jm7k4j73um3d1o2h88i0n2ma9p.apps.googleusercontent.com', // Android client ID for standalone
      web: '157942699599-miao9gillg9t60cbog343vgtav41kcah.apps.googleusercontent.com',
    }),
    redirectUri,
  });

    useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      FirebaseService.loginWithGoogle(id_token)
        .then(user => setUserToken(user))
        // MODIFIED CATCH BLOCK:
        .catch(err => {
            console.error('*** Google sign-in FAILED (Firebase error):', err);
        });
    }
  }, [response]);

  return { request, promptAsync, userToken };
}
