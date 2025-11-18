import React, { useEffect, useState } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    Alert,
    Share,
    ActivityIndicator,
    TextInput,
    ScrollView,
    Modal,
    RefreshControl,
    FlatList,
    KeyboardAvoidingView,
    Platform
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
    const [refreshing, setRefreshing] = useState(false);
    const [user, setUser] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('myRecipes');
    const [showUserShareModal, setShowUserShareModal] = useState(false);
    const [selectedRecipe, setSelectedRecipe] = useState(null);
    const [shareEmail, setShareEmail] = useState('');
    const [shareMessage, setShareMessage] = useState('');
    const [allUsers, setAllUsers] = useState([]);

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
        try {
            setLoading(true);
            await Promise.all([
                loadRecipes(),
                loadPinnedRecipes(),
                loadSharedRecipes(),
                loadAllUsers()
            ]);
        } catch (error) {
            console.log('Error loading data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const loadAllUsers = async () => {
        try {
            const users = await FirebaseService.getAllUsers();
            setAllUsers(users.filter(u => u.uid !== user?.uid));
        } catch (error) {
            console.log('Error loading users:', error.message);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadAllData();
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

            await Share.share({
                message: shareContent,
                title: `Share Recipe: ${recipe.title}`
            });
        } catch (error) {
            Alert.alert('Error', 'Failed to share recipe');
        }
    };

    const handleUserShare = (recipe) => {
        setSelectedRecipe(recipe);
        setShareEmail('');
        setShareMessage(`Check out this recipe: ${recipe.title}`);
        setShowUserShareModal(true);
    };

    const shareWithUser = async () => {
        if (!shareEmail.trim()) {
            Alert.alert('Error', 'Please enter a user email');
            return;
        }

        try {
            setLoading(true);
            await FirebaseService.shareRecipeWithUser(
                selectedRecipe.id, 
                shareEmail.trim(),
                shareMessage.trim() || `Check out this recipe: ${selectedRecipe.title}`
            );
            
            Alert.alert('Success', `Recipe shared with ${shareEmail}`);
            setShowUserShareModal(false);
            setShareEmail('');
            setShareMessage('');
            
        } catch (error) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const loadRecipes = async () => {
        try {
            const userRecipes = await FirebaseService.getUserRecipes();
            setRecipes(userRecipes);
        } catch (error) {
            console.log('Error loading recipes:', error.message);
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

    const handleFixData = async () => {
        Alert.alert(
            'Fix Data Types',
            'This will fix any recipes with incorrect data types.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Fix Now',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            const result = await FirebaseService.fixIsSharedDataTypes();
                            Alert.alert('Success', `Fixed ${result.count} recipes!`);
                            loadAllData();
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

    useFocusEffect(
        React.useCallback(() => {
            loadAllData();
        }, [])
    );

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

        if (!searchQuery.trim()) return recipesToFilter;

        return recipesToFilter.filter(recipe =>
            recipe.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            recipe.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (recipe.tags && recipe.tags.some(tag => 
                tag.toLowerCase().includes(searchQuery.toLowerCase())
            )) ||
            (recipe.sharedBy && recipe.sharedBy.toLowerCase().includes(searchQuery.toLowerCase()))
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
                            <TouchableOpacity 
                                style={styles.userShareButton}
                                onPress={() => handleUserShare(item)}
                            >
                                <Text style={styles.userShareButtonText}>👤</Text>
                            </TouchableOpacity>
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
                                        {item.isShared ? '🌍 Public' : '🌐Public'}
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
                        <Text style={styles.pinnedBadgeText}>📌 Pinned</Text>
                    </View>
                )}
                {isShared && (
                    <View style={styles.sharedBadge}>
                        <Text style={styles.sharedBadgeText}>🎁 Shared</Text>
                    </View>
                )}
                {!isPinned && !isShared && item.isShared && (
                    <View style={styles.publicBadge}>
                        <Text style={styles.publicBadgeText}>🌍 Public</Text>
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

        if (loading && !refreshing) {
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
            <FlatList
                data={filteredRecipes}
                renderItem={({ item }) => renderRecipeItem({ 
                    item, 
                    isPinned: activeTab === 'pinned',
                    isShared: activeTab === 'shared'
                })}
                keyExtractor={item => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#FF6B35']}
                        tintColor="#FF6B35"
                    />
                }
            />
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.userInfo}>
                    <Text style={styles.welcomeText}>Welcome ! To the Recipe Box</Text>
                    <Text style={styles.userName}>{user?.name}</Text>
                </View>
                <View style={styles.headerButtons}>
                   
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

            <View style={styles.content}>
                {renderTabContent()}
            </View>

            {activeTab === 'myRecipes' && (
                <TouchableOpacity 
                    style={styles.fab}
                    onPress={() => navigation.navigate('AddRecipe')}
                >
                    <Text style={styles.fabText}>+</Text>
                </TouchableOpacity>
            )}

            <Modal
                visible={showUserShareModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowUserShareModal(false)}
            >
                <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalContainer}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Share Recipe</Text>
                            <Text style={styles.recipeName}>{selectedRecipe?.title}</Text>
                            
                            <Text style={styles.modalLabel}>Enter user email:</Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="Enter user email"
                                value={shareEmail}
                                onChangeText={setShareEmail}
                                placeholderTextColor="#999"
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                            
                            <Text style={styles.modalLabel}>Message (optional):</Text>
                            <TextInput
                                style={[styles.textInput, styles.messageInput]}
                                placeholder="Add a message..."
                                value={shareMessage}
                                onChangeText={setShareMessage}
                                placeholderTextColor="#999"
                                multiline
                            />
                            
                            <View style={styles.modalButtons}>
                                <TouchableOpacity 
                                    style={[styles.modalButton, styles.cancelButton]}
                                    onPress={() => setShowUserShareModal(false)}
                                >
                                    <Text style={styles.cancelButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.modalButton, styles.shareButton, (!shareEmail.trim() || loading) && styles.disabledButton]}
                                    onPress={shareWithUser}
                                    disabled={!shareEmail.trim() || loading}
                                >
                                    <Text style={styles.shareButtonText}>
                                        {loading ? 'Sharing...' : 'Share Recipe'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
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
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
    },
    userInfo: {
        flex: 1,
    },
    welcomeText: {
        fontSize: 14,
        color: '#6c757d',
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
        backgroundColor: '#fd7e14',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
    },
    fixDataButtonText: {
        fontSize: 16,
        color: '#FFFFFF',
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
        backgroundColor: '#dc3545',
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
        borderBottomColor: '#e9ecef',
    },
    searchInput: {
        flex: 1,
        backgroundColor: '#f8f9fa',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        fontSize: 16,
        color: '#2D2D2D',
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    clearSearchButton: {
        padding: 8,
        marginLeft: 8,
    },
    clearSearchText: {
        fontSize: 18,
        color: '#6c757d',
        fontWeight: 'bold',
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
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
        color: '#6c757d',
    },
    activeTabText: {
        color: '#FF6B35',
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
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
    },
    quickShareButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    shareButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#FF6B35',
    },
    sharedButton: {
        backgroundColor: '#28a745',
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
        backgroundColor: '#ffc107',
        justifyContent: 'center',
        alignItems: 'center',
    },
    unpinButtonText: {
        fontSize: 16,
    },
    removeSharedButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#dc3545',
        justifyContent: 'center',
        alignItems: 'center',
    },
    removeSharedButtonText: {
        fontSize: 16,
        color: '#FFFFFF',
    },
    recipeDescription: {
        fontSize: 14,
        color: '#6c757d',
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
        color: '#6c757d',
        fontWeight: '500',
    },
    pinnedBadge: {
        backgroundColor: '#fff3cd',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#ffc107',
    },
    pinnedBadgeText: {
        fontSize: 10,
        color: '#856404',
        fontWeight: '600',
    },
    sharedBadge: {
        backgroundColor: '#d4edda',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#28a745',
    },
    sharedBadgeText: {
        fontSize: 10,
        color: '#155724',
        fontWeight: '600',
    },
    publicBadge: {
        backgroundColor: '#d1ecf1',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#17a2b8',
    },
    publicBadgeText: {
        fontSize: 10,
        color: '#0c5460',
        fontWeight: '600',
    },
    recipeAuthor: {
        fontSize: 12,
        color: '#6c757d',
        fontStyle: 'italic',
        marginBottom: 4,
    },
    recipeDate: {
        fontSize: 12,
        color: '#adb5bd',
        fontStyle: 'italic',
    },
    loadingText: {
        textAlign: 'center',
        color: '#6c757d',
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
        color: '#6c757d',
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
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#FF6B35',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    fabText: {
        color: '#FFFFFF',
        fontSize: 24,
        fontWeight: 'bold',
    },
    modalContainer: {
        flex: 1,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 24,
        width: '100%',
        maxHeight: '80%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2D2D2D',
        marginBottom: 8,
        textAlign: 'center',
    },
    recipeName: {
        fontSize: 16,
        color: '#FF6B35',
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 20,
    },
    modalLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2D2D2D',
        marginBottom: 8,
        marginTop: 16,
    },
    textInput: {
        backgroundColor: '#f8f9fa',
        borderWidth: 1,
        borderColor: '#e9ecef',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#2D2D2D',
        marginBottom: 12,
    },
    messageInput: {
        height: 80,
        textAlignVertical: 'top',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
        gap: 12,
    },
    modalButton: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#f8f9fa',
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    cancelButtonText: {
        color: '#6c757d',
        fontWeight: '600',
        fontSize: 16,
    },
    shareButton: {
        backgroundColor: '#FF6B35',
    },
    disabledButton: {
        backgroundColor: '#ccc',
        opacity: 0.6,
    },
    shareButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 16,
    },
});