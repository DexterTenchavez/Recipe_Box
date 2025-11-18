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
  limit
} from 'firebase/firestore';
import { auth, db } from './firebaseConfig';

class FirebaseServiceClass {
  // Helper method to ensure boolean values
  _ensureBoolean(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value === 'true';
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
      
      // Handle specific Firebase auth errors
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('This email is already registered. Please use a different email or login.');
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
      
      // Handle specific Firebase auth errors
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
        isShared: false, // Boolean false
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      console.log('Recipe data prepared:', recipeWithUser);

      // Add the recipe to Firestore
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
        throw new Error('Permission denied: You may not have permission to save recipes. Please make sure you are logged in.');
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
      
      if (error.code === 'permission-denied') {
        throw new Error('Permission denied: Cannot access recipes. Please make sure you are logged in.');
      } else if (error.code === 'failed-precondition') {
        console.log('Index required for getUserRecipes query');
        throw new Error('Database configuration in progress. Please try again in a few minutes.');
      } else if (error.code === 'unavailable') {
        throw new Error('Network error: Please check your internet connection.');
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

      console.log('User authenticated for public recipes:', user.uid);

      const recipesCollection = collection(db, 'recipes');
      const q = query(
        recipesCollection,
        where('isShared', '==', true),
        orderBy('createdAt', 'desc')
      );

      console.log('Executing Firestore query for public recipes...');
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
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      if (error.code === 'permission-denied') {
        throw new Error('Permission denied: Cannot access public recipes. Please make sure you are logged in.');
      } else if (error.code === 'failed-precondition') {
        console.log('Index required for getPublicRecipes query');
        throw new Error('Database configuration in progress. Please try again in a few minutes.');
      } else if (error.code === 'unavailable') {
        throw new Error('Network error: Please check your internet connection.');
      } else {
        throw new Error(`Failed to load public recipes: ${error.message}`);
      }
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

      // Update the recipe to be shared/public - ensure boolean true
      await setDoc(doc(db, 'recipes', recipeId), {
        ...recipeData,
        isShared: true, // Explicit boolean true
        sharedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });

      console.log('Recipe shared successfully');
      return true;
    } catch (error) {
      console.error('Error sharing recipe:', error);
      console.error('Error code:', error.code);
      
      if (error.code === 'permission-denied') {
        throw new Error('Permission denied: Cannot update recipe. Please make sure you are logged in.');
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

      // Update the recipe to be private
      await setDoc(doc(db, 'recipes', recipeId), {
        ...recipeData,
        isShared: false, // Boolean false
        updatedAt: serverTimestamp()
      }, { merge: true });

      console.log('Recipe unshared successfully');
      return true;
    } catch (error) {
      console.error('Error unsharing recipe:', error);
      console.error('Error code:', error.code);
      
      if (error.code === 'permission-denied') {
        throw new Error('Permission denied: Cannot update recipe. Please make sure you are logged in.');
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

      // Delete any pinned versions FIRST (before deleting the main recipe)
      await this.deletePinnedRecipeFromAllUsers(recipeId);
      
      // Then delete the main recipe
      await deleteDoc(doc(db, 'recipes', recipeId));
      
      console.log('Recipe and pinned versions deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting recipe:', error);
      console.error('Error code:', error.code);
      
      if (error.code === 'permission-denied') {
        throw new Error('Permission denied: Cannot delete recipe. Please check your Firestore security rules.');
      }
      throw new Error(`Failed to delete recipe: ${error.message}`);
    }
  }

  async deletePinnedRecipeFromAllUsers(recipeId) {
    try {
      console.log('Cleaning up pinned recipes for:', recipeId);
      
      // Delete from current user's pinned recipes
      const user = auth.currentUser;
      if (!user) return;

      const pinnedCollection = collection(db, 'users', user.uid, 'pinnedRecipes');
      const q = query(pinnedCollection, where('originalRecipeId', '==', recipeId));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.log('No pinned recipes found to delete');
        return;
      }

      const deletePromises = [];
      querySnapshot.forEach((doc) => {
        deletePromises.push(deleteDoc(doc.ref));
      });

      await Promise.all(deletePromises);
      console.log(`Deleted ${deletePromises.length} pinned versions of recipe:`, recipeId);
    } catch (error) {
      console.error('Error deleting pinned recipes:', error);
      // Don't throw error here - we don't want to fail the main delete if pinned delete fails
    }
  }

  // ---------- Pinned Recipes Management ----------
  async pinRecipe(recipe) {
    try {
      console.log('Pinning recipe:', recipe.id);
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Check if recipe is already pinned
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

      // Remove Firestore timestamp objects that can't be stored in nested documents
      delete pinnedRecipe.createdAt;
      delete pinnedRecipe.updatedAt;
      delete pinnedRecipe.sharedAt;

      // Store in user's pinned recipes collection
      const pinnedCollection = collection(db, 'users', user.uid, 'pinnedRecipes');
      await addDoc(pinnedCollection, pinnedRecipe);

      console.log('Recipe pinned successfully');
      return true;
    } catch (error) {
      console.error('Error pinning recipe:', error);
      console.error('Error code:', error.code);
      
      if (error.code === 'permission-denied') {
        throw new Error('Permission denied: Cannot pin recipe. Please make sure you are logged in.');
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

      // Find the pinned recipe document
      const pinnedCollection = collection(db, 'users', user.uid, 'pinnedRecipes');
      const q = query(pinnedCollection, where('originalRecipeId', '==', recipeId));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error('Pinned recipe not found');
      }

      // Delete the pinned recipe
      querySnapshot.forEach(async (doc) => {
        await deleteDoc(doc.ref);
      });

      console.log('Recipe unpinned successfully');
      return true;
    } catch (error) {
      console.error('Error unpinning recipe:', error);
      console.error('Error code:', error.code);
      
      if (error.code === 'permission-denied') {
        throw new Error('Permission denied: Cannot unpin recipe. Please make sure you are logged in.');
      }
      throw new Error(`Failed to unpin recipe: ${error.message}`);
    }
  }

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
      console.error('Error code:', error.code);
      
      // If permission denied or collection doesn't exist, return empty array
      if (error.code === 'permission-denied' || error.code === 'not-found') {
        console.log('No pinned recipes collection found, returning empty array');
        return [];
      } else if (error.code === 'unavailable') {
        throw new Error('Network error: Please check your internet connection.');
      } else {
        console.log('Other error, returning empty array:', error.message);
        return [];
      }
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

  // ---------- User Search for Sharing ----------
  async searchUsers(searchQuery) {
    try {
      console.log('Searching users:', searchQuery);
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      if (!searchQuery || searchQuery.length < 2) {
        return [];
      }

      const usersCollection = collection(db, 'users');
      const q = query(
        usersCollection,
        where('name', '>=', searchQuery),
        where('name', '<=', searchQuery + '\uf8ff'),
        orderBy('name'),
        limit(10)
      );

      const querySnapshot = await getDocs(q);
      const users = [];

      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        // Don't include current user in search results
        if (doc.id !== user.uid) {
          users.push({
            uid: doc.id,
            ...userData
          });
        }
      });

      console.log(`Found ${users.length} users`);
      return users;
    } catch (error) {
      console.error('Error searching users:', error);
      // If index doesn't exist, return empty array
      if (error.code === 'failed-precondition') {
        console.log('Index required for user search');
        return [];
      }
      throw new Error(`Failed to search users: ${error.message}`);
    }
  }

  // ---------- Share Recipe with Specific User ----------
  async shareRecipeWithUser(recipeId, targetUserId, message = '') {
    try {
      console.log('Sharing recipe with user:', { recipeId, targetUserId });
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Verify recipe exists and user owns it
      const recipeDoc = await getDoc(doc(db, 'recipes', recipeId));
      if (!recipeDoc.exists()) {
        throw new Error('Recipe not found');
      }

      const recipeData = recipeDoc.data();
      if (recipeData.userId !== user.uid) {
        throw new Error('You can only share your own recipes');
      }

      // Verify target user exists
      const targetUserDoc = await getDoc(doc(db, 'users', targetUserId));
      if (!targetUserDoc.exists()) {
        throw new Error('Target user not found');
      }

      // Create shared recipe document
      const sharedRecipeData = {
        originalRecipeId: recipeId,
        sharedBy: user.uid,
        sharedByUserName: user.displayName || 'Anonymous',
        sharedWith: targetUserId,
        sharedWithUserName: targetUserDoc.data().name,
        message: message,
        sharedAt: serverTimestamp(),
        recipeData: {
          title: recipeData.title,
          description: recipeData.description,
          ingredients: recipeData.ingredients,
          instructions: recipeData.instructions,
          prepTime: recipeData.prepTime,
          cookTime: recipeData.cookTime,
          totalTime: recipeData.totalTime,
          servings: recipeData.servings,
          tags: recipeData.tags || []
        }
      };

      // Add to shared recipes collection
      const sharedCollection = collection(db, 'sharedRecipes');
      await addDoc(sharedCollection, sharedRecipeData);

      console.log('Recipe shared successfully with user');
      return true;
    } catch (error) {
      console.error('Error sharing recipe with user:', error);
      throw new Error(`Failed to share recipe: ${error.message}`);
    }
  }

  // ---------- Get Recipes Shared with Current User ----------
  async getSharedRecipes() {
    try {
      console.log('Fetching shared recipes...');
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const sharedCollection = collection(db, 'sharedRecipes');
      const q = query(
        sharedCollection,
        where('sharedWith', '==', user.uid),
        orderBy('sharedAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const sharedRecipes = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        sharedRecipes.push({
          id: doc.id,
          ...data,
          sharedAt: data.sharedAt?.toDate?.() || new Date()
        });
      });

      console.log(`Found ${sharedRecipes.length} shared recipes`);
      return sharedRecipes;
    } catch (error) {
      console.error('Error getting shared recipes:', error);
      return [];
    }
  }

  // ---------- Remove Shared Recipe ----------
  async removeSharedRecipe(sharedRecipeId) {
    try {
      console.log('Removing shared recipe:', sharedRecipeId);
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Verify the shared recipe exists and belongs to current user
      const sharedDoc = await getDoc(doc(db, 'sharedRecipes', sharedRecipeId));
      if (!sharedDoc.exists()) {
        throw new Error('Shared recipe not found');
      }

      const sharedData = sharedDoc.data();
      if (sharedData.sharedWith !== user.uid) {
        throw new Error('You can only remove recipes shared with you');
      }

      await deleteDoc(doc(db, 'sharedRecipes', sharedRecipeId));
      console.log('Shared recipe removed successfully');
      return true;
    } catch (error) {
      console.error('Error removing shared recipe:', error);
      throw new Error(`Failed to remove shared recipe: ${error.message}`);
    }
  }

  // ---------- Fix Data Types ----------
  async fixIsSharedDataTypes() {
    try {
      console.log('Fixing isShared data types...');
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
        // Check if isShared exists and is a string
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
      console.log(`Fixed ${fixedCount} recipes with string isShared values`);
      return { success: true, count: fixedCount };
    } catch (error) {
      console.error('Error fixing data:', error);
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

  // Listen for auth state changes
  onAuthStateChange(callback) {
    return onAuthStateChanged(auth, callback);
  }

  // Get current user
  getCurrentUser() {
    return auth.currentUser;
  }

  // Test Firestore connection
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
      
      // Clean up the test document
      await deleteDoc(doc(db, '_connection_test', testDoc.id));
      
      console.log('Firestore connection test successful');
      return true;
    } catch (error) {
      console.error('Firestore connection test failed:', error);
      console.error('Error code:', error.code);
      
      if (error.code === 'permission-denied') {
        throw new Error('Firestore permission denied. Please check your security rules.');
      }
      return false;
    }
  }
}

// Export a single instance
export const FirebaseService = new FirebaseServiceClass();