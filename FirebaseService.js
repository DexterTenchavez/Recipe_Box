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

  async registerUser(name, email, password) {
    try {
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
    } catch (error) {
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
      if (!email || !password) throw new Error('Email and password are required');

      const { user } = await signInWithEmailAndPassword(auth, email, password);

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
        const user = auth.currentUser;
        if (!user) {
            throw new Error('User must be logged in to add recipes');
        }

        // Add user information and timestamps
        const recipeWithUser = {
            ...recipeData,
            userId: user.uid, // REQUIRED for Firestore rules
            userName: user.displayName || user.email || 'Anonymous',
            userEmail: user.email,
            createdAt: new Date(),
            updatedAt: new Date(),
            isShared: false // Default to not shared
        };

        console.log('🔥 Saving to Firestore:', recipeWithUser);
        const docRef = await addDoc(collection(db, 'recipes'), recipeWithUser);
        console.log('✅ Recipe added with ID:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('❌ Error adding recipe:', error);
        
        // Enhance error message for better debugging
        let enhancedError = error;
        if (error.code === 'permission-denied') {
            enhancedError.message = 'Permission denied. Check Firestore rules and user authentication.';
        } else if (error.code === 'unauthenticated') {
            enhancedError.message = 'User not authenticated. Please log in.';
        }
        
        throw enhancedError;
    }
}


  async getUserRecipes() {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated. Please log in again.');
      }

      const recipesCollection = collection(db, 'recipes');
      const q = query(
        recipesCollection,
        where('userId', '==', user.uid),
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
          isShared: this._ensureBoolean(data.isShared)
        });
      });

      return recipes;
    } catch (error) {
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
        const user = auth.currentUser;
        if (!user) {
            throw new Error('Please log in to view public recipes');
        }

        console.log('🔍 Fetching public recipes with isShared: true (TEMPORARY - no ordering)');
        
        const recipesCollection = collection(db, 'recipes');
        
        // TEMPORARY: Remove orderBy while index builds
        const q = query(
            recipesCollection,
            where('isShared', '==', true)
            // orderBy('createdAt', 'desc') // Commented out temporarily
        );

        const querySnapshot = await getDocs(q);
        const recipes = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            console.log('✅ Found public recipe:', doc.id, data.title, data.isShared);
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
                userName: data.userName || 'Anonymous',
                createdAt: data.createdAt || new Date()
            });
        });

        // Sort manually in JavaScript as temporary workaround
        recipes.sort((a, b) => {
            const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt) || new Date(0);
            const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt) || new Date(0);
            return dateB - dateA; // Descending order (newest first)
        });

        console.log(`📊 Total public recipes found: ${recipes.length}`);
        return recipes;
    } catch (error) {
        console.error('❌ Error getting public recipes:', error);
        if (error.code === 'failed-precondition') {
            throw new Error('Database indexes are building. Please wait 2-5 minutes and try again.');
        } else if (error.code === 'permission-denied') {
            throw new Error('Permission denied. Please check Firestore rules.');
        } else if (error.code === 'unavailable') {
            throw new Error('Network error. Please check your connection.');
        }
        throw new Error(`Failed to load public recipes: ${error.message}`);
    }
}

  async shareRecipe(recipeId) {
    try {
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
        throw new Error('You can only share your own recipes');
      }

      await updateDoc(doc(db, 'recipes', recipeId), {
        isShared: true,
        sharedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return true;
    } catch (error) {
      if (error.code === 'permission-denied') {
        throw new Error('Permission denied.');
      }
      throw new Error(`Failed to share recipe: ${error.message}`);
    }
  }

  async unshareRecipe(recipeId) {
    try {
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

      return true;
    } catch (error) {
      if (error.code === 'permission-denied') {
        throw new Error('Permission denied.');
      }
      throw new Error(`Failed to unshare recipe: ${error.message}`);
    }
  }

  async deleteRecipe(recipeId) {
    try {
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
        throw new Error('You can only delete your own recipes');
      }

      await this.deletePinnedRecipeFromAllUsers(recipeId);
      await deleteDoc(doc(db, 'recipes', recipeId));
      
      return true;
    } catch (error) {
      if (error.code === 'permission-denied') {
        throw new Error('Permission denied.');
      }
      throw new Error(`Failed to delete recipe: ${error.message}`);
    }
  }

  async getPinnedRecipes() {
    try {
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

      return pinnedRecipes;
    } catch (error) {
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
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

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

      delete pinnedRecipe.createdAt;
      delete pinnedRecipe.updatedAt;
      delete pinnedRecipe.sharedAt;

      const pinnedCollection = collection(db, 'users', user.uid, 'pinnedRecipes');
      const docRef = await addDoc(pinnedCollection, pinnedRecipe);

      return true;
    } catch (error) {
      if (error.code === 'permission-denied') {
        throw new Error('Permission denied.');
      }
      throw new Error(`Failed to pin recipe: ${error.message}`);
    }
  }

  async unpinRecipe(recipeId) {
    try {
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

      const deletePromises = [];
      querySnapshot.forEach((doc) => {
        deletePromises.push(deleteDoc(doc.ref));
      });

      await Promise.all(deletePromises);
      return true;
    } catch (error) {
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
    } catch (error) {
      console.error('Error deleting pinned recipes:', error);
    }
  }

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

  async searchRecipes(searchQuery, filters = {}) {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      let q;
      const recipesCollection = collection(db, 'recipes');
      
      if (searchQuery) {
        q = query(
          recipesCollection,
          where('title', '>=', searchQuery.toLowerCase()),
          where('title', '<=', searchQuery.toLowerCase() + '\uf8ff'),
          orderBy('title')
        );
      } else {
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

  async loginWithGoogle(id_token) {
    try {
      if (!id_token) throw new Error('Google Sign-In token is required');

      const credential = GoogleAuthProvider.credential(id_token);
      const { user } = await signInWithCredential(auth, credential);

      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
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
      throw new Error(`Google sign-in failed: ${error.message}`);
    }
  }

  async getAllUsers() {
    try {
      const usersCollection = collection(db, 'users');
      const usersSnapshot = await getDocs(usersCollection);
      const users = usersSnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      }));
      return users;
    } catch (error) {
      throw new Error('Failed to load users: ' + error.message);
    }
  }

async shareRecipeWithUser(recipeId, userEmail, message = '') {
    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error('User not authenticated');
        }

        const recipeDoc = await getDoc(doc(db, 'recipes', recipeId));
        if (!recipeDoc.exists()) {
            throw new Error('Recipe not found');
        }

        const recipeData = recipeDoc.data();
        const recipe = { 
            id: recipeDoc.id, 
            ...recipeData
        };

        // Normalize the email for comparison
        const normalizedEmail = userEmail.toLowerCase().trim();
        
        console.log('🔍 Looking for user with email:', normalizedEmail);

        const usersCollection = collection(db, 'users');
        const usersSnapshot = await getDocs(usersCollection);
        
        // Find user by email (case insensitive)
        const targetUser = usersSnapshot.docs.find(doc => {
            const userData = doc.data();
            return userData.email && userData.email.toLowerCase() === normalizedEmail;
        });

        if (!targetUser) {
            throw new Error(`User with email "${userEmail}" not found. Make sure they have an account and the email is correct.`);
        }

        const targetUserData = targetUser.data();
        
        console.log('✅ Found user:', targetUserData.name || targetUserData.email);
        
        if (targetUser.id === user.uid) {
            throw new Error('You cannot share a recipe with yourself');
        }

        const sharedRecipeData = {
            recipeId: recipeId,
            recipeData: recipe,
            sharedBy: user.uid,
            sharedByUserName: user.displayName || 'Anonymous',
            sharedByEmail: user.email,
            sharedWith: targetUser.id,
            sharedWithEmail: normalizedEmail,
            sharedWithUserName: targetUserData.name || 'User',
            message: message,
            sharedAt: serverTimestamp()
        };

        console.log('💾 Saving shared recipe data...');

        const sharedRecipesCollection = collection(db, 'sharedRecipes');
        await addDoc(sharedRecipesCollection, sharedRecipeData);

        console.log('✅ Recipe shared successfully');
        return { success: true };
    } catch (error) {
        console.error('❌ Error sharing recipe:', error);
        if (error.code === 'permission-denied') {
            throw new Error('Permission denied to share recipe');
        } else if (error.code === 'not-found') {
            throw new Error('User or recipe not found');
        }
        throw new Error(`Failed to share recipe: ${error.message}`);
    }
}

  async getSharedRecipes() {
    try {
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
          recipeData: data.recipeData || {},
          sharedByUserName: data.sharedByUserName || 'Anonymous',
          sharedAt: data.sharedAt?.toDate?.() || new Date()
        });
      });

      return sharedRecipes;
    } catch (error) {
      if (error.code === 'permission-denied' || error.code === 'not-found') {
        return [];
      }
      throw new Error(`Failed to load shared recipes: ${error.message}`);
    }
  }

  async removeSharedRecipe(sharedRecipeId) {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const sharedDoc = await getDoc(doc(db, 'sharedRecipes', sharedRecipeId));
      if (!sharedDoc.exists()) {
        throw new Error('Shared recipe not found');
      }

      const sharedData = sharedDoc.data();
      if (sharedData.sharedWith !== user.uid) {
        throw new Error('You can only remove recipes shared with you');
      }

      await deleteDoc(doc(db, 'sharedRecipes', sharedRecipeId));
      return true;
    } catch (error) {
      throw new Error(`Failed to remove shared recipe: ${error.message}`);
    }
  }

  async logoutUser() {
    try {
      await signOut(auth);
    } catch (error) {
      throw new Error(`Logout failed: ${error.message}`);
    }
  }

  onAuthStateChange(callback) {
    return onAuthStateChanged(auth, callback);
  }

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

    // Test with a simple read operation instead of write
    const usersCollection = collection(db, 'users');
    const userDoc = doc(usersCollection, user.uid);
    
    // Try to read the user's document
    const userSnapshot = await getDoc(userDoc);
    
    if (userSnapshot.exists()) {
      console.log('Firestore connection test successful - User document found');
      return true;
    } else {
      console.log('Firestore connection test successful - No user document (this is ok)');
      return true;
    }
  } catch (error) {
    console.error('Firestore connection test failed:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    throw error;
  }
}

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

export const FirebaseService = new FirebaseServiceClass();