import { initializeApp } from "firebase/app";
import { initializeFirestore } from "firebase/firestore";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ✅ Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAr4Sa8SX5zPyRD9wZR-3IOLjyw_SKcDHU",
  authDomain: "recipe-book-9eb60.firebaseapp.com",
  projectId: "recipe-book-9eb60",
  storageBucket: "recipe-book-9eb60.appspot.com",
  messagingSenderId: "157942699599",
  appId: "1:157942699599:web:d10a49202cc9eb1f87fc3a",
};

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);


export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  useFetchStreams: false,
});

// ✅ Firebase Auth with AsyncStorage persistence
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});