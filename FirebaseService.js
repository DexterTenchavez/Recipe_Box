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

class FirebaseServiceClass {
  // ---------- Authentication ----------

  async registerUser(name, email, password) {
    if (!name || !email || !password) throw new Error('All fields are required');
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(user, { displayName: name });
    await setDoc(doc(db, 'users', user.uid), {
      name,
      email,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { uid: user.uid, name, email };
  }

  async loginUser(email, password) {
    if (!email || !password) throw new Error('Email and password are required');
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    const snap = await getDoc(doc(db, 'users', user.uid));
    const data = snap.exists() ? snap.data() : {};
    return { uid: user.uid, name: data.name || user.displayName, email: user.email, ...data };
  }

  async loginWithGoogle(id_token) {
    if (!id_token) throw new Error('Google Sign-In token is required');
    const credential = GoogleAuthProvider.credential(id_token);
    const { user } = await signInWithCredential(auth, credential);
    const snap = await getDoc(doc(db, 'users', user.uid));
    if (!snap.exists()) {
      await setDoc(doc(db, 'users', user.uid), {
        name: user.displayName || 'Anonymous',
        email: user.email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
    return { uid: user.uid, name: user.displayName, email: user.email };
  }

  async logoutUser() {
    await signOut(auth);
  }

  onAuthStateChange(callback) {
    return onAuthStateChanged(auth, callback);
  }
}

// Export a single instance
export const FirebaseService = new FirebaseServiceClass();