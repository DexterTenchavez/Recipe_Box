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
  deleteDoc,
  updateDoc
} from 'firebase/firestore';
import { auth, db } from './firebaseConfig';

class FirebaseServiceClass {
  _ensureBoolean(value) {
    if (value === true || value === false) return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === 1 || value === '1') return true;
    if (value === 0 || value === '0') return false;
    return false;
  }

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
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('This email is already registered.');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('Password should be at least 6 characters.');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Invalid email address.');
      }
      throw new Error(`Registration failed: ${error.message}`);
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
      if (error.code === 'auth/user-not-found') {
        throw new Error('No account found with this email.');
      } else if (error.code === 'auth/wrong-password') {
        throw new Error('Incorrect password.');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Invalid email address.');
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('Too many failed attempts. Please try again later.');
      }
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

      // Validate required fields
      if (!recipeData.title?.trim()) {
        throw new Error('Recipe title is required');
      }
      if (!recipeData.ingredients || recipeData.ingredients.length === 0) {
        throw new Error('At least one ingredient is required');
      }
      if (!recipeData.instructions || recipeData.instructions.length === 0) {
        throw new Error('At least one instruction is required');
      }

      const recipeWithUser = {
        ...recipeData,
        userId: user.uid,
        userName: user.displayName || 'Anonymous',
        userEmail: user.email,
        isShared: false, // Default to private
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        totalTime: (parseInt(recipeData.prepTime) || 0) + (parseInt(recipeData.cookTime) || 0)
      };

      console.log('Recipe data prepared:', recipeWithUser);

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
        const data = doc.data();
        recipes.push({
          id: doc.id,
          ...data,
          title: data.title || 'Untitled Recipe',
          ingredients: data.ingredients || [],
          instructions: data.instructions || [],
          prepTime: data.prepTime || 0,
          cookTime: data.cookTime || 0,
          totalTime: data.totalTime || 0,
          servings: data.servings || 1,
          isShared: this._ensureBoolean(data.isShared)
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

  async getPublicRecipes() {
    try {
      console.log('Fetching public recipes...');
      const user = auth.currentUser;
      if (!user) {
        throw new Error('Please log in to view public recipes');
      }

      const recipesCollection = collection(db, 'recipes');
      const q = query(
        recipesCollection,
        where('isShared', '==', true),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const recipes = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        recipes.push({
          id: doc.id,
          ...data,
          title: data.title || 'Untitled Recipe',
          ingredients: data.ingredients || [],
          instructions: data.instructions || [],
          prepTime: data.prepTime || 0,
          cookTime: data.cookTime || 0,
          totalTime: data.totalTime || 0,
          servings: data.servings || 1,
          isShared: this._ensureBoolean(data.isShared),
          userName: data.userName || 'Anonymous'
        });
      });

      console.log(`Found ${recipes.length} public recipes`);
      return recipes;
    } catch (error) {
      console.error('Error getting public recipes:', error);
      if (error.code === 'permission-denied') {
        throw new Error('Permission denied.');
      } else if (error.code === 'failed-precondition') {
        throw new Error('Database configuration in progress.');
      } else if (error.code === 'unavailable') {
        throw new Error('Network error.');
      }
      throw new Error(`Failed to load public recipes: ${error.message}`);
    }
  }

  async shareRecipe(recipeId) {
    try {
      console.log('Sharing recipe:', recipeId);
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
        throw new Error('You can only share your own recipes');
      }

      await updateDoc(doc(db, 'recipes', recipeId), {
        isShared: true,
        sharedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      console.log('Recipe shared successfully');
      return true;
    } catch (error) {
      console.error('Error sharing recipe:', error);
      if (error.code === 'permission-denied') {
        throw new Error('Permission denied.');
      }
      throw new Error(`Failed to share recipe: ${error.message}`);
    }
  }

  async unshareRecipe(recipeId) {
    try {
      console.log('Unsharing recipe:', recipeId);
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const recipeDoc = await getDoc(doc(db, 'recipes', recipeId));
      if (!recipeDoc.exists()) {
        throw new Error('Recipe not found');
      }

      const recipeData = recipeDoc.data();
      if (recipeData.userId !== user.uid) {
        throw new Error('You can only unshare your own recipes');
      }

      await updateDoc(doc(db, 'recipes', recipeId), {
        isShared: false,
        updatedAt: serverTimestamp()
      });

      console.log('Recipe unshared successfully');
      return true;
    } catch (error) {
      console.error('Error unsharing recipe:', error);
      if (error.code === 'permission-denied') {
        throw new Error('Permission denied.');
      }
      throw new Error(`Failed to unshare recipe: ${error.message}`);
    }
  }

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

      // Delete any pinned versions of this recipe
      await this.deletePinnedRecipeFromAllUsers(recipeId);
      
      // Delete the recipe itself
      await deleteDoc(doc(db, 'recipes', recipeId));
      
      console.log('Recipe deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting recipe:', error);
      if (error.code === 'permission-denied') {
        throw new Error('Permission denied.');
      }
      throw new Error(`Failed to delete recipe: ${error.message}`);
    }
  }

  // ---------- Pinned Recipes ----------
  async getPinnedRecipes() {
    try {
      console.log('Fetching pinned recipes...');
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const pinnedCollection = collection(db, 'users', user.uid, 'pinnedRecipes');
      const q = query(pinnedCollection, orderBy('pinnedAt', 'desc'));
      
      const querySnapshot = await getDocs(q);
      const pinnedRecipes = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        pinnedRecipes.push({
          id: doc.id,
          ...data,
          title: data.title || 'Untitled Recipe',
          ingredients: data.ingredients || [],
          instructions: data.instructions || [],
          prepTime: data.prepTime || 0,
          cookTime: data.cookTime || 0,
          totalTime: data.totalTime || 0,
          servings: data.servings || 1,
          userName: data.userName || 'Anonymous',
          isShared: this._ensureBoolean(data.isShared)
        });
      });

      console.log(`Found ${pinnedRecipes.length} pinned recipes`);
      return pinnedRecipes;
    } catch (error) {
      console.error('Error getting pinned recipes:', error);
      if (error.code === 'permission-denied' || error.code === 'not-found') {
        return [];
      } else if (error.code === 'unavailable') {
        throw new Error('Network error.');
      }
      return [];
    }
  }

  async pinRecipe(recipe) {
    try {
      console.log('Pinning recipe:', recipe.id);
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Check if already pinned
      const isAlreadyPinned = await this.isRecipePinned(recipe.id);
      if (isAlreadyPinned) {
        throw new Error('Recipe is already pinned');
      }

      const pinnedRecipe = {
        ...recipe,
        pinnedBy: user.uid,
        pinnedAt: serverTimestamp(),
        originalRecipeId: recipe.id,
        title: recipe.title,
        description: recipe.description,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        totalTime: recipe.totalTime,
        servings: recipe.servings,
        userName: recipe.userName,
        userEmail: recipe.userEmail,
        userId: recipe.userId,
        isShared: this._ensureBoolean(recipe.isShared),
        tags: recipe.tags || []
      };

      // Remove Firestore timestamps that can't be copied
      delete pinnedRecipe.createdAt;
      delete pinnedRecipe.updatedAt;
      delete pinnedRecipe.sharedAt;

      const pinnedCollection = collection(db, 'users', user.uid, 'pinnedRecipes');
      const docRef = await addDoc(pinnedCollection, pinnedRecipe);

      console.log('Recipe pinned successfully with ID:', docRef.id);
      return true;
    } catch (error) {
      console.error('Error pinning recipe:', error);
      if (error.code === 'permission-denied') {
        throw new Error('Permission denied.');
      }
      throw new Error(`Failed to pin recipe: ${error.message}`);
    }
  }

  async unpinRecipe(recipeId) {
    try {
      console.log('Unpinning recipe:', recipeId);
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const pinnedCollection = collection(db, 'users', user.uid, 'pinnedRecipes');
      const q = query(pinnedCollection, where('originalRecipeId', '==', recipeId));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error('Pinned recipe not found');
      }

      // Delete all pinned instances (should only be one)
      const deletePromises = [];
      querySnapshot.forEach((doc) => {
        deletePromises.push(deleteDoc(doc.ref));
      });

      await Promise.all(deletePromises);
      console.log('Recipe unpinned successfully');
      return true;
    } catch (error) {
      console.error('Error unpinning recipe:', error);
      if (error.code === 'permission-denied') {
        throw new Error('Permission denied.');
      }
      throw new Error(`Failed to unpin recipe: ${error.message}`);
    }
  }

  async isRecipePinned(recipeId) {
    try {
      const user = auth.currentUser;
      if (!user) {
        return false;
      }

      const pinnedCollection = collection(db, 'users', user.uid, 'pinnedRecipes');
      const q = query(pinnedCollection, where('originalRecipeId', '==', recipeId));
      const querySnapshot = await getDocs(q);

      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error checking if recipe is pinned:', error);
      return false;
    }
  }

  async deletePinnedRecipeFromAllUsers(recipeId) {
    try {
      console.log('Deleting pinned recipe from all users:', recipeId);
      // This would require a cloud function for production
      // For now, we only delete from current user's pinned recipes
      const user = auth.currentUser;
      if (!user) return;

      const pinnedCollection = collection(db, 'users', user.uid, 'pinnedRecipes');
      const q = query(pinnedCollection, where('originalRecipeId', '==', recipeId));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return;
      }

      const deletePromises = [];
      querySnapshot.forEach((doc) => {
        deletePromises.push(deleteDoc(doc.ref));
      });

      await Promise.all(deletePromises);
      console.log('Pinned recipes deleted successfully');
    } catch (error) {
      console.error('Error deleting pinned recipes:', error);
    }
  }

  // ---------- User Management ----------
  async getUserData(userId) {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        return userDoc.data();
      }
      return null;
    } catch (error) {
      console.error('Error getting user data:', error);
      throw error;
    }
  }

  async updateUserProfile(userId, updates) {
    try {
      await setDoc(doc(db, 'users', userId), {
        ...updates,
        updatedAt: serverTimestamp()
      }, { merge: true });
      return true;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  // ---------- Search ----------
  async searchRecipes(searchQuery, filters = {}) {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      let q;
      const recipesCollection = collection(db, 'recipes');
      
      if (searchQuery) {
        // Simple search by title (case insensitive)
        q = query(
          recipesCollection,
          where('title', '>=', searchQuery.toLowerCase()),
          where('title', '<=', searchQuery.toLowerCase() + '\uf8ff'),
          orderBy('title')
        );
      } else {
        // If no search query, return user's recipes
        q = query(
          recipesCollection,
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
      }

      const querySnapshot = await getDocs(q);
      const recipes = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        recipes.push({
          id: doc.id,
          ...data,
          title: data.title || 'Untitled Recipe',
          ingredients: data.ingredients || [],
          instructions: data.instructions || [],
          prepTime: data.prepTime || 0,
          cookTime: data.cookTime || 0,
          totalTime: data.totalTime || 0,
          servings: data.servings || 1,
          isShared: this._ensureBoolean(data.isShared)
        });
      });

      return recipes;
    } catch (error) {
      console.error('Error searching recipes:', error);
      throw error;
    }
  }

  // ---------- Google Sign-In ----------
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

  // ---------- Logout ----------
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

  // ---------- Auth State Listener ----------
  onAuthStateChange(callback) {
    return onAuthStateChanged(auth, callback);
  }

  // ---------- Utility Methods ----------
  getCurrentUser() {
    return auth.currentUser;
  }

  async testFirestoreConnection() {
    try {
      console.log('Testing Firestore connection...');
      const user = auth.currentUser;
      if (!user) {
        throw new Error('Please log in to test Firestore connection');
      }

      const testCollection = collection(db, '_connection_test');
      const testDoc = await addDoc(testCollection, {
        test: true,
        userId: user.uid,
        timestamp: serverTimestamp()
      });
      
      await deleteDoc(doc(db, '_connection_test', testDoc.id));
      
      console.log('Firestore connection test successful');
      return true;
    } catch (error) {
      console.error('Firestore connection test failed:', error);
      if (error.code === 'permission-denied') {
        throw new Error('Firestore permission denied.');
      }
      return false;
    }
  }

  // ---------- Data Fix Methods ----------
  async fixIsSharedDataTypes() {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const recipesCollection = collection(db, 'recipes');
      const querySnapshot = await getDocs(recipesCollection);
      
      let fixedCount = 0;
      const updates = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.isShared !== undefined && typeof data.isShared === 'string') {
          updates.push(
            setDoc(doc.ref, {
              isShared: data.isShared === 'true' || data.isShared === true
            }, { merge: true })
          );
          fixedCount++;
        }
      });
      
      await Promise.all(updates);
      return { success: true, count: fixedCount };
    } catch (error) {
      throw error;
    }
  }
}

// Export a single instance
export const FirebaseService = new FirebaseServiceClass();