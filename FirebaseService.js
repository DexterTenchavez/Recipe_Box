// FirebaseService.js
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithCredential,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';

// Simple in-memory cache (optional)
const userCache = {};

class FirebaseServiceClass {
  // ---------- Authentication ----------

  // Register user
  async registerUser(name, email, password) {
    if (!name || !email || !password) throw new Error('All fields are required');

    const { user } = await createUserWithEmailAndPassword(auth, email, password);

    // Firestore write and profile update in parallel
    Promise.all([
      updateProfile(user, { displayName: name }),
      setDoc(doc(db, 'users', user.uid), {
        name,
        email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
    ]).catch(console.error);

    // Cache user locally
    userCache[user.uid] = { uid: user.uid, name, email };

    // Return immediately
    return { uid: user.uid, name, email };
  }

  // Login user
  async loginUser(email, password) {
    if (!email || !password) throw new Error('Email and password are required');

    const { user } = await signInWithEmailAndPassword(auth, email, password);

    // Check cache first
    if (userCache[user.uid]) return userCache[user.uid];

    // Firestore read (optional: done asynchronously)
    let data = {};
    try {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) data = snap.data();
    } catch (err) {
      console.warn('Failed to fetch Firestore data:', err.message);
    }

    const userData = { uid: user.uid, name: data.name || user.displayName, email: user.email, ...data };

    // Cache for next login
    userCache[user.uid] = userData;

    return userData;
  }

  // Google Sign-In
  async loginWithGoogle(id_token) {
    if (!id_token) throw new Error('Google Sign-In token is required');

    const credential = GoogleAuthProvider.credential(id_token);
    const { user } = await signInWithCredential(auth, credential);

    // Check cache first
    if (userCache[user.uid]) return userCache[user.uid];

    // Firestore read to see if user exists
    const snap = await getDoc(doc(db, 'users', user.uid));
    if (!snap.exists()) {
      // Firestore write in background
      setDoc(doc(db, 'users', user.uid), {
        name: user.displayName || 'Anonymous',
        email: user.email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }).catch(console.error);
    }

    const userData = { uid: user.uid, name: user.displayName, email: user.email };
    userCache[user.uid] = userData;

    return userData;
  }

  // Logout
  async logoutUser() {
    await signOut(auth);
  }

  // Listen for auth state changes
  onAuthStateChange(callback) {
    return onAuthStateChanged(auth, callback);
  }
}

// Export a single instance
export const FirebaseService = new FirebaseServiceClass();