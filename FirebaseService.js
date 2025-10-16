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
import { 
  doc, 
  setDoc, 
  getDoc, 
  serverTimestamp,
  addDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  deleteDoc 
} from 'firebase/firestore';
import { auth, db } from './firebaseConfig';

class FirebaseServiceClass {
  // ---------- Authentication ----------
  async registerUser(name, email, password) {
    try {
      console.log('Starting user registration...');
      if (!name || !email || !password) throw new Error('All fields are required');

      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      console.log('User created successfully:', user.uid);

      // Update profile and create user document
      await updateProfile(user, { displayName: name });
      await setDoc(doc(db, 'users', user.uid), {
        name,
        email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      console.log('User profile and document created');
      return { uid: user.uid, name, email };
    } catch (error) {
      console.error('Registration error:', error);
      throw new Error(`Registration failed: ${error.message}`);
    }
  }
  // Add to FirebaseService class
async deleteRecipe(recipeId) {
    try {
        console.log('Deleting recipe:', recipeId);
        const user = auth.currentUser;
        if (!user) {
            throw new Error('User not authenticated');
        }

        // First, verify the user owns this recipe
        const recipeDoc = await getDoc(doc(db, 'recipes', recipeId));
        if (!recipeDoc.exists()) {
            throw new Error('Recipe not found');
        }

        const recipeData = recipeDoc.data();
        if (recipeData.userId !== user.uid) {
            throw new Error('You can only delete your own recipes');
        }

        // Delete the recipe
        await deleteDoc(doc(db, 'recipes', recipeId));
        console.log('Recipe deleted successfully');
        
        return true;
    } catch (error) {
        console.error('Error deleting recipe:', error);
        throw error;
    }
}

  async loginUser(email, password) {
    try {
      console.log('Starting user login...');
      if (!email || !password) throw new Error('Email and password are required');

      const { user } = await signInWithEmailAndPassword(auth, email, password);
      console.log('User logged in successfully:', user.uid);

      // Get user data from Firestore
      let userData = {};
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          userData = userDoc.data();
        }
      } catch (firestoreError) {
        console.warn('Could not fetch user data from Firestore:', firestoreError);
      }

      const completeUserData = {
        uid: user.uid,
        name: userData.name || user.displayName,
        email: user.email,
        ...userData
      };

      return completeUserData;
    } catch (error) {
      console.error('Login error:', error);
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  // ---------- Recipe Management ----------
  async addRecipe(recipeData) {
    try {
      console.log('Starting to add recipe...');
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated. Please log in again.');
      }

      console.log('User authenticated:', user.uid);

      const recipeWithUser = {
        ...recipeData,
        userId: user.uid,
        userEmail: user.email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      console.log('Recipe data prepared:', recipeWithUser);

      // Test Firestore connection with a simple operation first
      console.log('Testing Firestore connection...');
      const testCollection = collection(db, '_test_connection');
      await addDoc(testCollection, { test: true, timestamp: serverTimestamp() });
      console.log('Firestore connection test passed');

      // Now add the actual recipe
      console.log('Adding recipe to Firestore...');
      const recipesCollection = collection(db, 'recipes');
      const docRef = await addDoc(recipesCollection, recipeWithUser);
      
      console.log('Recipe added successfully with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error adding recipe:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      if (error.code === 'unavailable') {
        throw new Error('Network error: Please check your internet connection and try again.');
      } else if (error.code === 'permission-denied') {
        throw new Error('Permission denied: You may not have permission to save recipes.');
      } else {
        throw new Error(`Failed to save recipe: ${error.message}`);
      }
    }
  }

  async getUserRecipes() {
    try {
      console.log('Fetching user recipes...');
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated. Please log in again.');
      }

      console.log('User authenticated for recipe fetch:', user.uid);

      const recipesCollection = collection(db, 'recipes');
      const q = query(
        recipesCollection,
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );

      console.log('Executing Firestore query...');
      const querySnapshot = await getDocs(q);
      const recipes = [];

      querySnapshot.forEach((doc) => {
        recipes.push({
          id: doc.id,
          ...doc.data()
        });
      });

      console.log(`Found ${recipes.length} recipes for user`);
      return recipes;
    } catch (error) {
      console.error('Error getting user recipes:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      if (error.code === 'unavailable') {
        throw new Error('Network error: Please check your internet connection.');
      } else if (error.code === 'permission-denied') {
        throw new Error('Permission denied: Cannot access recipes.');
      } else {
        throw new Error(`Failed to load recipes: ${error.message}`);
      }
    }
  }

  // Google Sign-In
  async loginWithGoogle(id_token) {
    try {
      console.log('Starting Google sign-in...');
      if (!id_token) throw new Error('Google Sign-In token is required');

      const credential = GoogleAuthProvider.credential(id_token);
      const { user } = await signInWithCredential(auth, credential);
      console.log('Google sign-in successful:', user.uid);

      // Check if user document exists, create if not
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        console.log('Creating new user document for Google user');
        await setDoc(userDocRef, {
          name: user.displayName || 'Anonymous',
          email: user.email,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      return {
        uid: user.uid,
        name: user.displayName,
        email: user.email
      };
    } catch (error) {
      console.error('Google login error:', error);
      throw new Error(`Google sign-in failed: ${error.message}`);
    }
  }

  // Logout
  async logoutUser() {
    try {
      console.log('Logging out user...');
      await signOut(auth);
      console.log('User logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      throw new Error(`Logout failed: ${error.message}`);
    }
  }

  // Listen for auth state changes
  onAuthStateChange(callback) {
    return onAuthStateChanged(auth, callback);
  }

  // Test Firestore connection
  async testFirestoreConnection() {
    try {
      console.log('Testing Firestore connection...');
      const testCollection = collection(db, '_connection_test');
      const testDoc = await addDoc(testCollection, {
        test: true,
        timestamp: serverTimestamp()
      });
      console.log('Firestore connection test successful');
      return true;
    } catch (error) {
      console.error('Firestore connection test failed:', error);
      return false;
    }
  }
}

// Export a single instance
export const FirebaseService = new FirebaseServiceClass();