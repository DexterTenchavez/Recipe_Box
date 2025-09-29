// HomeScreen.js
import React, { useEffect, useState } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    FlatList, 
    Alert,
    SafeAreaView 
} from 'react-native';
import { FirebaseService } from './FirebaseService';
import { auth } from './firebaseConfig';

export default function HomeScreen({ navigation }) {
    const [recipes, setRecipes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState(null);

    useEffect(() => {
        // Get current user info
        const currentUser = auth.currentUser;
        if (currentUser) {
            setUser({
                name: currentUser.displayName || 'User',
                email: currentUser.email
            });
        }

        // Load user's recipes
        loadRecipes();
    }, []);

    const loadRecipes = async () => {
        try {
            setLoading(true);
            const userRecipes = await FirebaseService.getUserRecipes();
            setRecipes(userRecipes);
        } catch (error) {
            Alert.alert('Error', 'Failed to load recipes: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    onPress: async () => {
                        try {
                            await FirebaseService.logoutUser();
                            navigation.replace('Login');
                        } catch (error) {
                            Alert.alert('Error', 'Failed to logout: ' + error.message);
                        }
                    }
                }
            ]
        );
    };

    const renderRecipeItem = ({ item }) => (
        <View style={styles.recipeCard}>
            <Text style={styles.recipeTitle}>{item.title}</Text>
            <Text style={styles.recipeDescription} numberOfLines={2}>
                {item.description}
            </Text>
            <Text style={styles.recipeDate}>
                Created: {item.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}
            </Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.welcomeText}>Welcome back!</Text>
                    <Text style={styles.userName}>{user?.name}</Text>
                </View>
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Text style={styles.logoutButtonText}>Logout</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>My Recipes</Text>
                    <TouchableOpacity 
                        style={styles.addButton}
                        onPress={() => {
                            // Navigate to add recipe screen (you'll create this later)
                            Alert.alert('Coming Soon', 'Add recipe feature will be implemented next!');
                        }}
                    >
                        <Text style={styles.addButtonText}>+ Add Recipe</Text>
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <Text style={styles.loadingText}>Loading recipes...</Text>
                ) : recipes.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>No recipes yet!</Text>
                        <Text style={styles.emptyStateSubtext}>
                            Start building your recipe collection
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={recipes}
                        renderItem={renderRecipeItem}
                        keyExtractor={(item) => item.id}
                        style={styles.recipesList}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
    },
    welcomeText: {
        fontSize: 16,
        color: '#6c757d',
    },
    userName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#212529',
    },
    logoutButton: {
        backgroundColor: '#dc3545',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 6,
    },
    logoutButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
    content: {
        flex: 1,
        padding: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#212529',
    },
    addButton: {
        backgroundColor: '#FF6B35',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 6,
    },
    addButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
    recipesList: {
        flex: 1,
    },
    recipeCard: {
        backgroundColor: '#fff',
        padding: 16,
        marginBottom: 12,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    recipeTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#212529',
        marginBottom: 4,
    },
    recipeDescription: {
        fontSize: 14,
        color: '#6c757d',
        marginBottom: 8,
    },
    recipeDate: {
        fontSize: 12,
        color: '#adb5bd',
    },
    loadingText: {
        textAlign: 'center',
        color: '#6c757d',
        fontSize: 16,
        marginTop: 40,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyStateText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#6c757d',
        marginBottom: 8,
    },
    emptyStateSubtext: {
        fontSize: 14,
        color: '#adb5bd',
        textAlign: 'center',
    },
});