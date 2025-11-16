import React, { useEffect, useState } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    FlatList, 
    Alert,
    Share,
    ActivityIndicator,
    TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { FirebaseService } from './FirebaseService';
import { auth } from './firebaseConfig';

export default function HomeScreen({ navigation }) {
    const [recipes, setRecipes] = useState([]);
    const [pinnedRecipes, setPinnedRecipes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const currentUser = auth.currentUser;
        if (currentUser) {
            setUser({
                name: currentUser.displayName || 'User',
                email: currentUser.email,
                uid: currentUser.uid
            });
        }
        loadRecipes();
        loadPinnedRecipes();
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

    const loadPinnedRecipes = async () => {
        try {
            const pinned = await FirebaseService.getPinnedRecipes();
            setPinnedRecipes(pinned);
        } catch (error) {
            console.log('Error loading pinned recipes:', error.message);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            loadRecipes();
            loadPinnedRecipes();
        }, [])
    );

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

    const handleShareRecipe = async (recipe) => {
        try {
            if (recipe.isShared) {
                await FirebaseService.unshareRecipe(recipe.id);
                Alert.alert('Success', 'Recipe unshared successfully!');
            } else {
                await FirebaseService.shareRecipe(recipe.id);
                Alert.alert('Success', 'Recipe shared publicly!');
            }
            loadRecipes();
        } catch (error) {
            Alert.alert('Error', 'Failed to update recipe sharing: ' + error.message);
        }
    };

    const handleQuickShare = async (recipe) => {
        try {
            const shareContent = `
🍽️ ${recipe.title}

${recipe.description ? `${recipe.description}\n` : ''}

⏱️ Prep: ${recipe.prepTime}m | Cook: ${recipe.cookTime}m | Total: ${recipe.totalTime}m
👨‍👩‍👧‍👦 Servings: ${recipe.servings}

📋 INGREDIENTS:
${recipe.ingredients.map(ingredient => `• ${ingredient}`).join('\n')}

👩‍🍳 INSTRUCTIONS:
${recipe.instructions.map((instruction, index) => `${index + 1}. ${instruction}`).join('\n')}

${recipe.tags && recipe.tags.length > 0 ? `\n🏷️ Tags: ${recipe.tags.join(', ')}` : ''}

Shared from Recipe Book App 🍳
            `.trim();

            const result = await Share.share({
                message: shareContent,
                title: `Share Recipe: ${recipe.title}`
            });

            if (result.action === Share.sharedAction) {
                console.log('Recipe shared successfully');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to share recipe: ' + error.message);
        }
    };

    const handleUnpinRecipe = async (recipeId) => {
        try {
            await FirebaseService.unpinRecipe(recipeId);
            loadPinnedRecipes();
            Alert.alert('Success', 'Recipe unpinned!');
        } catch (error) {
            Alert.alert('Error', 'Failed to unpin recipe: ' + error.message);
        }
    };

    const filteredRecipes = recipes.filter(recipe =>
        recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recipe.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (recipe.tags && recipe.tags.some(tag => 
            tag.toLowerCase().includes(searchQuery.toLowerCase())
        ))
    );

    const filteredPinnedRecipes = pinnedRecipes.filter(recipe =>
        recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recipe.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (recipe.tags && recipe.tags.some(tag => 
            tag.toLowerCase().includes(searchQuery.toLowerCase())
        ))
    );

    const renderRecipeItem = ({ item, isPinned = false }) => (
        <TouchableOpacity 
            style={styles.recipeCard}
            onPress={() => navigation.navigate('RecipeDetails', { recipe: item })}
        >
            <View style={styles.recipeHeader}>
                <Text style={styles.recipeTitle}>{item.title}</Text>
                <View style={styles.recipeActions}>
                    {isPinned ? (
                        <TouchableOpacity 
                            style={styles.unpinButton}
                            onPress={() => handleUnpinRecipe(item.id)}
                        >
                            <Text style={styles.unpinButtonText}>📌</Text>
                        </TouchableOpacity>
                    ) : (
                        <>
                            <TouchableOpacity 
                                style={styles.quickShareButton}
                                onPress={() => handleQuickShare(item)}
                            >
                                <Text style={styles.quickShareButtonText}>↗</Text>
                            </TouchableOpacity>
                            {user?.uid === item.userId && (
                                <TouchableOpacity 
                                    style={[
                                        styles.shareButton, 
                                        item.isShared && styles.sharedButton
                                    ]}
                                    onPress={() => handleShareRecipe(item)}
                                >
                                    <Text style={styles.shareButtonText}>
                                        {item.isShared ? 'Published' : 'Publish'}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </>
                    )}
                </View>
            </View>
            <Text style={styles.recipeDescription} numberOfLines={2}>
                {item.description}
            </Text>
            <View style={styles.recipeMeta}>
                <View style={styles.metaItem}>
                    <Text style={styles.metaIcon}>⏱️</Text>
                    <Text style={styles.recipeTime}>{item.totalTime} min</Text>
                </View>
                <View style={styles.metaItem}>
                    <Text style={styles.metaIcon}>👥</Text>
                    <Text style={styles.recipeServings}>{item.servings} servings</Text>
                </View>
                {isPinned && (
                    <View style={styles.pinnedBadge}>
                        <Text style={styles.pinnedBadgeText}>Pinned</Text>
                    </View>
                )}
                {!isPinned && item.isShared && (
                    <View style={styles.sharedBadge}>
                        <Text style={styles.sharedBadgeText}>Public</Text>
                    </View>
                )}
            </View>
            {isPinned && (
                <Text style={styles.recipeAuthor}>
                    by {item.userName}
                </Text>
            )}
            <Text style={styles.recipeDate}>
                Created: {item.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}
            </Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.userInfo}>
                    <Text style={styles.welcomeText}>Welcome back! 👋</Text>
                    <Text style={styles.userName}>{user?.name}</Text>
                </View>
                <View style={styles.headerButtons}>
                    <TouchableOpacity 
                        style={styles.publicRecipesButton}
                        onPress={() => navigation.navigate('PublicRecipes')}
                    >
                        <Text style={styles.publicRecipesButtonText}>Browse Recipes</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                        <Text style={styles.logoutButtonText}>Logout</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search recipes..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholderTextColor="#999"
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity 
                        style={styles.clearSearchButton}
                        onPress={() => setSearchQuery('')}
                    >
                        <Text style={styles.clearSearchText}>✕</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Content */}
            <View style={styles.content}>
                {/* Pinned Recipes Section */}
                {pinnedRecipes.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>📌 Pinned Recipes</Text>
                        </View>
                        <FlatList
                            data={filteredPinnedRecipes}
                            renderItem={({ item }) => renderRecipeItem({ item, isPinned: true })}
                            keyExtractor={(item) => `pinned-${item.id}`}
                            style={styles.recipesList}
                            showsVerticalScrollIndicator={false}
                            scrollEnabled={false}
                        />
                    </View>
                )}

                {/* My Recipes Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>My Recipes</Text>
                        <TouchableOpacity 
                            style={styles.addButton}
                            onPress={() => navigation.navigate('AddRecipe')}
                        >
                            <Text style={styles.addButtonText}>+ Add Recipe</Text>
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <View style={styles.centerContent}>
                            <ActivityIndicator size="large" color="#FF6B35" />
                            <Text style={styles.loadingText}>Loading your recipes...</Text>
                        </View>
                    ) : filteredRecipes.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyIcon}>🍳</Text>
                            <Text style={styles.emptyStateText}>
                                {searchQuery ? 'No recipes found' : 'No recipes yet!'}
                            </Text>
                            <Text style={styles.emptyStateSubtext}>
                                {searchQuery ? 'Try a different search term' : 'Start building your recipe collection'}
                            </Text>
                            {!searchQuery && (
                                <TouchableOpacity 
                                    style={styles.addButton}
                                    onPress={() => navigation.navigate('AddRecipe')}
                                >
                                    <Text style={styles.addButtonText}>+ Add Your First Recipe</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    ) : (
                        <FlatList
                            data={filteredRecipes}
                            renderItem={renderRecipeItem}
                            keyExtractor={(item) => item.id}
                            style={styles.recipesList}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.listContent}
                        />
                    )}
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF8F5',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#FFE5D9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    userInfo: {
        flex: 1,
    },
    welcomeText: {
        fontSize: 14,
        color: '#666666',
        marginBottom: 4,
    },
    userName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2D2D2D',
    },
    headerButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    publicRecipesButton: {
        backgroundColor: '#FF6B35',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
    },
    publicRecipesButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 12,
    },
    logoutButton: {
        backgroundColor: '#FF3B30',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
    },
    logoutButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 12,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#FFE5D9',
    },
    searchInput: {
        flex: 1,
        backgroundColor: '#FFF8F5',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        fontSize: 16,
        color: '#2D2D2D',
        borderWidth: 1,
        borderColor: '#FFE5D9',
    },
    clearSearchButton: {
        padding: 8,
        marginLeft: 8,
    },
    clearSearchText: {
        fontSize: 18,
        color: '#666666',
        fontWeight: 'bold',
    },
    content: {
        flex: 1,
        padding: 20,
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2D2D2D',
    },
    addButton: {
        backgroundColor: '#FF6B35',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    addButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
    },
    centerContent: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    recipeCard: {
        backgroundColor: '#FFFFFF',
        padding: 20,
        marginBottom: 16,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
        borderLeftWidth: 4,
        borderLeftColor: '#FF6B35',
    },
    recipeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    recipeTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2D2D2D',
        flex: 1,
        marginRight: 12,
    },
    recipeActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    quickShareButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#17a2b8',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    quickShareButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    shareButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: '#FF6B35',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    sharedButton: {
        backgroundColor: '#666666',
    },
    shareButtonText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
    unpinButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FFD700',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    unpinButtonText: {
        fontSize: 16,
    },
    recipeDescription: {
        fontSize: 14,
        color: '#666666',
        marginBottom: 16,
        lineHeight: 20,
    },
    recipeMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaIcon: {
        fontSize: 12,
    },
    recipeTime: {
        fontSize: 12,
        color: '#FF6B35',
        fontWeight: '600',
    },
    recipeServings: {
        fontSize: 12,
        color: '#666666',
        fontWeight: '500',
    },
    sharedBadge: {
        backgroundColor: '#FF6B35',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    sharedBadgeText: {
        fontSize: 10,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    pinnedBadge: {
        backgroundColor: '#FFD700',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    pinnedBadgeText: {
        fontSize: 10,
        color: '#2D2D2D',
        fontWeight: '600',
    },
    recipeAuthor: {
        fontSize: 12,
        color: '#666666',
        fontStyle: 'italic',
        marginBottom: 4,
    },
    recipeDate: {
        fontSize: 12,
        color: '#999999',
        fontStyle: 'italic',
    },
    loadingText: {
        textAlign: 'center',
        color: '#666666',
        fontSize: 16,
        marginTop: 12,
    },
    emptyState: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: 16,
    },
    emptyStateText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2D2D2D',
        marginBottom: 8,
        textAlign: 'center',
    },
    emptyStateSubtext: {
        fontSize: 14,
        color: '#666666',
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 20,
    },
    listContent: {
        paddingBottom: 20,
    },
});