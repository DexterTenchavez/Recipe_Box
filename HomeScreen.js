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
    TextInput,
    ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { FirebaseService } from './FirebaseService';
import { auth } from './firebaseConfig';

export default function HomeScreen({ navigation }) {
    const [recipes, setRecipes] = useState([]);
    const [pinnedRecipes, setPinnedRecipes] = useState([]);
    const [sharedRecipes, setSharedRecipes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('myRecipes'); // 'myRecipes', 'pinned', 'shared'

    useEffect(() => {
        const currentUser = auth.currentUser;
        if (currentUser) {
            setUser({
                name: currentUser.displayName || 'User',
                email: currentUser.email,
                uid: currentUser.uid
            });
        }
        loadAllData();
    }, []);

    const loadAllData = async () => {
        await Promise.all([
            loadRecipes(),
            loadPinnedRecipes(),
            loadSharedRecipes()
        ]);
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

    const loadSharedRecipes = async () => {
        try {
            const shared = await FirebaseService.getSharedRecipes();
            setSharedRecipes(shared);
        } catch (error) {
            console.log('Error loading shared recipes:', error.message);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            loadAllData();
        }, [])
    );

    const handleFixData = async () => {
        Alert.alert(
            'Fix Data Types',
            'This will fix any recipes with incorrect data types. Run this once if you\'re experiencing errors.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Fix Now',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            const result = await FirebaseService.fixIsSharedDataTypes();
                            Alert.alert('Success', `Fixed ${result.count} recipes!`);
                            loadAllData(); // Refresh data
                        } catch (error) {
                            Alert.alert('Error', 'Failed to fix data: ' + error.message);
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
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

   

    const handleUnpinRecipe = async (pinnedRecipeId) => {
        try {
            await FirebaseService.unpinRecipe(pinnedRecipeId);
            loadPinnedRecipes();
            Alert.alert('Success', 'Recipe unpinned!');
        } catch (error) {
            if (error.message.includes('Pinned recipe not found')) {
                // Recipe was already deleted, just refresh the list
                console.log('Recipe already removed, refreshing list...');
                loadPinnedRecipes();
            } else {
                Alert.alert('Error', 'Failed to unpin recipe: ' + error.message);
            }
        }
    };

    const handleRemoveSharedRecipe = async (sharedRecipeId) => {
        try {
            await FirebaseService.removeSharedRecipe(sharedRecipeId);
            loadSharedRecipes();
            Alert.alert('Success', 'Shared recipe removed!');
        } catch (error) {
            Alert.alert('Error', 'Failed to remove shared recipe: ' + error.message);
        }
    };

    // Filter recipes based on search query and active tab
    const getFilteredRecipes = () => {
        let recipesToFilter = [];
        
        switch (activeTab) {
            case 'myRecipes':
                recipesToFilter = recipes;
                break;
            case 'pinned':
                recipesToFilter = pinnedRecipes;
                break;
            case 'shared':
                recipesToFilter = sharedRecipes.map(shared => ({
                    ...shared.recipeData,
                    id: shared.id,
                    sharedBy: shared.sharedByUserName,
                    sharedAt: shared.sharedAt,
                    isSharedRecipe: true
                }));
                break;
        }

        return recipesToFilter.filter(recipe =>
            recipe.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            recipe.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (recipe.tags && recipe.tags.some(tag => 
                tag.toLowerCase().includes(searchQuery.toLowerCase())
            )) ||
            (recipe.sharedBy && recipe.sharedBy.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    };

    const renderRecipeItem = ({ item, isPinned = false, isShared = false }) => (
        <TouchableOpacity 
            style={styles.recipeCard}
            onPress={() => navigation.navigate('RecipeDetails', { 
                recipe: item,
                isSharedRecipe: isShared 
            })}
        >
            <View style={styles.recipeHeader}>
                <Text style={styles.recipeTitle}>{item.title}</Text>
                <View style={styles.recipeActions}>
                    {isPinned ? (
                        <TouchableOpacity 
                            style={styles.unpinButton}
                            onPress={() => handleUnpinRecipe(item.originalRecipeId || item.id)}
                        >
                            <Text style={styles.unpinButtonText}>📌</Text>
                        </TouchableOpacity>
                    ) : isShared ? (
                        <TouchableOpacity 
                            style={styles.removeSharedButton}
                            onPress={() => handleRemoveSharedRecipe(item.id)}
                        >
                            <Text style={styles.removeSharedButtonText}>🗑️</Text>
                        </TouchableOpacity>
                    ) : (
                        <>
                           {/*<TouchableOpacity 
                                style={styles.userShareButton}
                                onPress={() => handleUserShare(item)}
                            >
                                <Text style={styles.userShareButtonText}>👤</Text>
                            </TouchableOpacity> */} 
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
                {item.description || 'No description'}
            </Text>
            <View style={styles.recipeMeta}>
                <View style={styles.metaItem}>
                    <Text style={styles.metaIcon}>⏱️</Text>
                    <Text style={styles.recipeTime}>{item.totalTime || 0} min</Text>
                </View>
                <View style={styles.metaItem}>
                    <Text style={styles.metaIcon}>👥</Text>
                    <Text style={styles.recipeServings}>{item.servings || 1} servings</Text>
                </View>
                {isPinned && (
                    <View style={styles.pinnedBadge}>
                        <Text style={styles.pinnedBadgeText}>Pinned</Text>
                    </View>
                )}
                {isShared && (
                    <View style={styles.sharedBadge}>
                        <Text style={styles.sharedBadgeText}>Shared</Text>
                    </View>
                )}
                {!isPinned && !isShared && item.isShared && (
                    <View style={styles.publicBadge}>
                        <Text style={styles.publicBadgeText}>Public</Text>
                    </View>
                )}
            </View>
            {isPinned && (
                <Text style={styles.recipeAuthor}>
                    by {item.userName || 'Unknown'}
                </Text>
            )}
            {isShared && (
                <Text style={styles.recipeAuthor}>
                    Shared by {item.sharedBy || 'Unknown'}
                </Text>
            )}
            <Text style={styles.recipeDate}>
                {isPinned ? 'Pinned' : isShared ? 'Shared' : 'Created'}: {' '}
                {item.createdAt?.toDate?.()?.toLocaleDateString() || 
                 item.sharedAt?.toLocaleDateString() || 
                 'Unknown'}
            </Text>
        </TouchableOpacity>
    );

    const renderTabContent = () => {
        const filteredRecipes = getFilteredRecipes();

        if (loading) {
            return (
                <View style={styles.centerContent}>
                    <ActivityIndicator size="large" color="#FF6B35" />
                    <Text style={styles.loadingText}>Loading recipes...</Text>
                </View>
            );
        }

        if (filteredRecipes.length === 0) {
            return (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>
                        {activeTab === 'myRecipes' ? '🍳' : 
                         activeTab === 'pinned' ? '📌' : '🎁'}
                    </Text>
                    <Text style={styles.emptyStateText}>
                        {searchQuery ? 'No recipes found' : getEmptyStateMessage()}
                    </Text>
                    <Text style={styles.emptyStateSubtext}>
                        {searchQuery ? 'Try a different search term' : getEmptyStateSubtext()}
                    </Text>
                    {!searchQuery && activeTab === 'myRecipes' && (
                        <TouchableOpacity 
                            style={styles.addButton}
                            onPress={() => navigation.navigate('AddRecipe')}
                        >
                            <Text style={styles.addButtonText}>+ Add Your First Recipe</Text>
                        </TouchableOpacity>
                    )}
                </View>
            );
        }

        return (
            <ScrollView 
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {filteredRecipes.map((item) => (
                    <View key={item.id}>
                        {renderRecipeItem({ 
                            item, 
                            isPinned: activeTab === 'pinned',
                            isShared: activeTab === 'shared'
                        })}
                    </View>
                ))}
            </ScrollView>
        );
    };

    const getEmptyStateMessage = () => {
        switch (activeTab) {
            case 'myRecipes':
                return 'No recipes yet!';
            case 'pinned':
                return 'No pinned recipes!';
            case 'shared':
                return 'No shared recipes!';
            default:
                return 'No recipes found';
        }
    };

    const getEmptyStateSubtext = () => {
        switch (activeTab) {
            case 'myRecipes':
                return 'Start building your recipe collection';
            case 'pinned':
                return 'Pin recipes from the community to see them here';
            case 'shared':
                return 'Recipes shared with you will appear here';
            default:
                return '';
        }
    };

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
                        style={styles.fixDataButton}
                        onPress={handleFixData}
                    >
                        <Text style={styles.fixDataButtonText}>🔧</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={styles.publicRecipesButton}
                        onPress={() => navigation.navigate('PublicRecipes')}
                    >
                        <Text style={styles.publicRecipesButtonText}>Browse</Text>
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
                    placeholder={`Search ${activeTab === 'myRecipes' ? 'my' : activeTab} recipes...`}
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

            {/* Tabs */}
            <View style={styles.tabContainer}>
                <TouchableOpacity 
                    style={[styles.tab, activeTab === 'myRecipes' && styles.activeTab]}
                    onPress={() => setActiveTab('myRecipes')}
                >
                    <Text style={[styles.tabText, activeTab === 'myRecipes' && styles.activeTabText]}>
                        My Recipes ({recipes.length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.tab, activeTab === 'pinned' && styles.activeTab]}
                    onPress={() => setActiveTab('pinned')}
                >
                    <Text style={[styles.tabText, activeTab === 'pinned' && styles.activeTabText]}>
                        Pinned ({pinnedRecipes.length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.tab, activeTab === 'shared' && styles.activeTab]}
                    onPress={() => setActiveTab('shared')}
                >
                    <Text style={[styles.tabText, activeTab === 'shared' && styles.activeTabText]}>
                        Shared ({sharedRecipes.length})
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Add Recipe Button for My Recipes tab */}
            {activeTab === 'myRecipes' && (
                <View style={styles.addRecipeSection}>
                    <TouchableOpacity 
                        style={styles.addButtonLarge}
                        onPress={() => navigation.navigate('AddRecipe')}
                    >
                        <Text style={styles.addButtonLargeText}>+ Add New Recipe</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Content */}
            <View style={styles.content}>
                {renderTabContent()}
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
    fixDataButton: {
        backgroundColor: '#FFA500',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
    },
    fixDataButtonText: {
        fontSize: 16,
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
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#FFE5D9',
    },
    tab: {
        flex: 1,
        paddingVertical: 16,
        alignItems: 'center',
        borderBottomWidth: 3,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: '#FF6B35',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666666',
    },
    activeTabText: {
        color: '#FF6B35',
    },
    addRecipeSection: {
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#FFE5D9',
    },
    addButtonLarge: {
        backgroundColor: '#FF6B35',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    addButtonLargeText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 16,
    },
    content: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    centerContent: {
        flex: 1,
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
    userShareButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#28a745',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    userShareButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
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
    removeSharedButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FF3B30',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    removeSharedButtonText: {
        fontSize: 16,
        color: '#FFFFFF',
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
    sharedBadge: {
        backgroundColor: '#28a745',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    sharedBadgeText: {
        fontSize: 10,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    publicBadge: {
        backgroundColor: '#FF6B35',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    publicBadgeText: {
        fontSize: 10,
        color: '#FFFFFF',
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
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
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
    addButton: {
        backgroundColor: '#FF6B35',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    addButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});