import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Alert,
    TextInput,
    ActivityIndicator,
    Share,
    RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { FirebaseService } from './FirebaseService';
import { auth } from './firebaseConfig';

export default function PublicRecipesScreen({ navigation }) {
    const [recipes, setRecipes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [userPinnedRecipes, setUserPinnedRecipes] = useState([]);

    useEffect(() => {
        loadPublicRecipes();
        loadUserPinnedRecipes();
    }, []);

    const loadPublicRecipes = async () => {
        try {
            setLoading(true);
            const publicRecipes = await FirebaseService.getPublicRecipes();
            setRecipes(publicRecipes);
        } catch (error) {
            Alert.alert('Error', 'Failed to load public recipes: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const loadUserPinnedRecipes = async () => {
        try {
            const pinned = await FirebaseService.getPinnedRecipes();
            setUserPinnedRecipes(pinned);
        } catch (error) {
            console.log('Error loading pinned recipes:', error.message);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([loadPublicRecipes(), loadUserPinnedRecipes()]);
        setRefreshing(false);
    };

    useFocusEffect(
        React.useCallback(() => {
            loadPublicRecipes();
            loadUserPinnedRecipes();
        }, [])
    );

    const handlePinRecipe = async (recipe) => {
        try {
            // Check if already pinned
            const isPinned = userPinnedRecipes.some(
                pinned => pinned.originalRecipeId === recipe.id
            );

            if (isPinned) {
                Alert.alert('Info', 'Recipe is already pinned!');
                return;
            }

            await FirebaseService.pinRecipe(recipe);
            await loadUserPinnedRecipes();
            Alert.alert('Success', 'Recipe pinned to your collection!');
        } catch (error) {
            if (error.message.includes('already pinned')) {
                Alert.alert('Info', 'Recipe is already pinned!');
                await loadUserPinnedRecipes();
            } else {
                Alert.alert('Error', 'Failed to pin recipe: ' + error.message);
            }
        }
    };

    const handleUnpinRecipe = async (recipeId) => {
        try {
            await FirebaseService.unpinRecipe(recipeId);
            await loadUserPinnedRecipes();
            Alert.alert('Success', 'Recipe unpinned!');
        } catch (error) {
            Alert.alert('Error', 'Failed to unpin recipe: ' + error.message);
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

Shared by: ${recipe.userName || 'Anonymous'}

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

    const isRecipePinned = (recipeId) => {
        return userPinnedRecipes.some(
            pinned => pinned.originalRecipeId === recipeId
        );
    };

    // Filter recipes based on search query
    const filteredRecipes = recipes.filter(recipe =>
        recipe.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recipe.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recipe.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (recipe.tags && recipe.tags.some(tag =>
            tag.toLowerCase().includes(searchQuery.toLowerCase())
        ))
    );

    const renderRecipeItem = ({ item }) => {
        const pinned = isRecipePinned(item.id);

        return (
            <TouchableOpacity
                style={styles.recipeCard}
                onPress={() => navigation.navigate('RecipeDetails', {
                    recipe: item,
                    isSharedRecipe: true
                })}
            >
                <View style={styles.recipeHeader}>
                    <Text style={styles.recipeTitle}>{item.title}</Text>
                    <View style={styles.recipeActions}>
                        <TouchableOpacity
                            style={styles.quickShareButton}
                            onPress={() => handleQuickShare(item)}
                        >
                            <Text style={styles.quickShareButtonText}>↗</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.pinButton,
                                pinned && styles.unpinButton
                            ]}
                            onPress={() => pinned ? handleUnpinRecipe(item.id) : handlePinRecipe(item)}
                        >
                            <Text style={styles.pinButtonText}>
                                {pinned ? '📌' : '📄'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {item.description && (
                    <Text style={styles.recipeDescription} numberOfLines={2}>
                        {item.description}
                    </Text>
                )}

                <View style={styles.recipeMeta}>
                    <View style={styles.metaItem}>
                        <Text style={styles.metaIcon}>⏱️</Text>
                        <Text style={styles.recipeTime}>{item.totalTime || 0} min</Text>
                    </View>
                    <View style={styles.metaItem}>
                        <Text style={styles.metaIcon}>👥</Text>
                        <Text style={styles.recipeServings}>{item.servings || 1} servings</Text>
                    </View>
                    {pinned && (
                        <View style={styles.pinnedBadge}>
                            <Text style={styles.pinnedBadgeText}>Pinned</Text>
                        </View>
                    )}
                </View>

                <View style={styles.recipeFooter}>
                    <Text style={styles.recipeAuthor}>
                        by {item.userName || 'Anonymous'}
                    </Text>
                    <Text style={styles.recipeDate}>
                        {item.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}
                    </Text>
                </View>

                {item.tags && item.tags.length > 0 && (
                    <View style={styles.tagsContainer}>
                        {item.tags.slice(0, 3).map((tag, index) => (
                            <View key={index} style={styles.tag}>
                                <Text style={styles.tagText}>#{tag}</Text>
                            </View>
                        ))}
                        {item.tags.length > 3 && (
                            <Text style={styles.moreTags}>+{item.tags.length - 3} more</Text>
                        )}
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.backButtonText}>←</Text>
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.title}>Community Recipes</Text>
                        <Text style={styles.subtitle}>
                            Discover recipes shared by others
                        </Text>
                    </View>
                </View>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search recipes, tags, or authors..."
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

            {/* Stats */}
            <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{filteredRecipes.length}</Text>
                    <Text style={styles.statLabel}>Recipes</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={styles.statNumber}>
                        {recipes.filter(r => r.userName).length}
                    </Text>
                    <Text style={styles.statLabel}>Contributors</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={styles.statNumber}>
                        {userPinnedRecipes.length}
                    </Text>
                    <Text style={styles.statLabel}>Your Pins</Text>
                </View>
            </View>

            {/* Content */}
            <View style={styles.content}>
                {loading && !refreshing ? (
                    <View style={styles.centerContent}>
                        <ActivityIndicator size="large" color="#FF6B35" />
                        <Text style={styles.loadingText}>Loading community recipes...</Text>
                    </View>
                ) : filteredRecipes.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyIcon}>🍳</Text>
                        <Text style={styles.emptyStateText}>
                            {searchQuery ? 'No recipes found' : 'No public recipes yet'}
                        </Text>
                        <Text style={styles.emptyStateSubtext}>
                            {searchQuery
                                ? 'Try a different search term'
                                : 'Be the first to share a recipe with the community!'
                            }
                        </Text>
                        {!searchQuery && (
                            <TouchableOpacity
                                style={styles.addButton}
                                onPress={() => navigation.navigate('AddRecipe')}
                            >
                                <Text style={styles.addButtonText}>+ Share Your Recipe</Text>
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
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                colors={['#FF6B35']}
                                tintColor="#FF6B35"
                            />
                        }
                        contentContainerStyle={styles.listContent}
                    />
                )}
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
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFF8F5',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FFE5D9',
    },
    backButtonText: {
        fontSize: 20,
        color: '#2D2D2D',
        fontWeight: 'bold',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2D2D2D',
    },
    subtitle: {
        fontSize: 14,
        color: '#666666',
        marginTop: 2,
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
    statsContainer: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#FFE5D9',
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FF6B35',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: '#666666',
        fontWeight: '500',
    },
    statDivider: {
        width: 1,
        backgroundColor: '#FFE5D9',
        marginHorizontal: 10,
    },
    content: {
        flex: 1,
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        textAlign: 'center',
        color: '#666666',
        fontSize: 16,
        marginTop: 12,
    },
    recipesList: {
        flex: 1,
    },
    listContent: {
        padding: 20,
        paddingBottom: 40,
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
        borderLeftColor: '#17a2b8',
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
    pinButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FF6B35',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    unpinButton: {
        backgroundColor: '#FFD700',
    },
    pinButtonText: {
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
        marginBottom: 12,
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
    recipeFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    recipeAuthor: {
        fontSize: 12,
        color: '#FF6B35',
        fontWeight: '600',
        fontStyle: 'italic',
    },
    recipeDate: {
        fontSize: 12,
        color: '#999999',
        fontStyle: 'italic',
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    tag: {
        backgroundColor: '#17a2b8',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    tagText: {
        fontSize: 10,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    moreTags: {
        fontSize: 10,
        color: '#666666',
        fontStyle: 'italic',
        marginLeft: 4,
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