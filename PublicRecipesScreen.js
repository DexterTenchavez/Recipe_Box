import React, { useEffect, useState } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    FlatList, 
    Alert,
    ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FirebaseService } from './FirebaseService';
import * as Speech from 'expo-speech';

export default function PublicRecipesScreen({ navigation }) {
    const [recipes, setRecipes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [speakingRecipeId, setSpeakingRecipeId] = useState(null);

    useEffect(() => {
        loadPublicRecipes();
        
        // Clean up speech when component unmounts
        return () => {
            Speech.stop();
        };
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
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadPublicRecipes();
    };

    const speakRecipePreview = async (recipe) => {
        try {
            // Stop any currently speaking recipe
            if (speakingRecipeId) {
                Speech.stop();
                if (speakingRecipeId === recipe.id) {
                    setSpeakingRecipeId(null);
                    return;
                }
            }

            setSpeakingRecipeId(recipe.id);

            const previewContent = `
                Recipe: ${recipe.title}. 
                ${recipe.description ? `Description: ${recipe.description}. ` : ''}
                Preparation time: ${recipe.prepTime || 0} minutes. 
                Cook time: ${recipe.cookTime || 0} minutes. 
                Total time: ${recipe.totalTime || 0} minutes. 
                Servings: ${recipe.servings || 1}. 
                Created by: ${recipe.userName || 'Anonymous'}.
                Tap to view full recipe with ingredients and instructions.
            `.trim();

            const speechOptions = {
                language: 'en',
                pitch: 1.0,
                rate: 0.8,
                onStart: () => setSpeakingRecipeId(recipe.id),
                onDone: () => setSpeakingRecipeId(null),
                onStopped: () => setSpeakingRecipeId(null),
                onError: (error) => {
                    console.error('Speech error:', error);
                    setSpeakingRecipeId(null);
                }
            };

            await Speech.speak(previewContent, speechOptions);

        } catch (error) {
            console.error('Speech error:', error);
            setSpeakingRecipeId(null);
            Alert.alert('Error', 'Failed to read recipe preview: ' + error.message);
        }
    };

    const stopAllSpeech = () => {
        Speech.stop();
        setSpeakingRecipeId(null);
    };

    const renderRecipeItem = ({ item }) => (
        <TouchableOpacity 
            style={[
                styles.recipeCard,
                speakingRecipeId === item.id && styles.speakingCard
            ]}
            onPress={() => navigation.navigate('RecipeDetails', { recipe: item })}
            onLongPress={() => speakRecipePreview(item)}
            delayLongPress={300}
        >
            <View style={styles.recipeHeader}>
                <View style={styles.titleContainer}>
                    <Text style={styles.recipeTitle}>{item.title}</Text>
                    <TouchableOpacity 
                        style={[
                            styles.voiceButton,
                            speakingRecipeId === item.id && styles.voiceButtonActive
                        ]}
                        onPress={() => speakRecipePreview(item)}
                    >
                        <Text style={styles.voiceButtonIcon}>
                            {speakingRecipeId === item.id ? '🔊' : '🔈'}
                        </Text>
                    </TouchableOpacity>
                </View>
                <Text style={styles.recipeAuthor}>by {item.userName}</Text>
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
                {item.isShared && (
                    <View style={styles.sharedBadge}>
                        <Text style={styles.sharedBadgeText}>Public</Text>
                    </View>
                )}
            </View>
            
            {/* Voice Hint */}
            <View style={styles.voiceHint}>
                <Text style={styles.voiceHintText}>
                    {speakingRecipeId === item.id ? 
                     'Speaking... Tap to stop' : 
                     'Tap and hold or press speaker to hear preview'}
                </Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity 
                    style={styles.backButton}
                    onPress={() => {
                        stopAllSpeech();
                        navigation.goBack();
                    }}
                >
                    <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Community Recipes</Text>
                <View style={styles.headerActions}>
                    {speakingRecipeId && (
                        <TouchableOpacity 
                            style={styles.stopAllButton}
                            onPress={stopAllSpeech}
                        >
                            <Text style={styles.stopAllButtonText}>⏹️ Stop</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity 
                        style={styles.refreshButton}
                        onPress={onRefresh}
                        disabled={refreshing}
                    >
                        <Text style={styles.refreshButtonText}>
                            {refreshing ? '⟳' : '↻'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Voice Instructions */}
            <View style={styles.voiceInstructions}>
                <Text style={styles.voiceInstructionsText}>
                    🔊 Tap speaker icon or press and hold any recipe to hear a preview
                </Text>
            </View>

            {/* Content */}
            <View style={styles.content}>
                {loading ? (
                    <View style={styles.centerContent}>
                        <ActivityIndicator size="large" color="#FF6B35" />
                        <Text style={styles.loadingText}>Loading community recipes...</Text>
                    </View>
                ) : recipes.length === 0 ? (
                    <View style={styles.centerContent}>
                        <Text style={styles.emptyIcon}>🍳</Text>
                        <Text style={styles.emptyStateText}>No public recipes yet!</Text>
                        <Text style={styles.emptyStateSubtext}>
                            Be the first to share a recipe with the community
                        </Text>
                        <TouchableOpacity 
                            style={styles.addRecipeButton}
                            onPress={() => navigation.navigate('AddRecipe')}
                        >
                            <Text style={styles.addRecipeButtonText}>+ Create Recipe</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <FlatList
                        data={recipes}
                        renderItem={renderRecipeItem}
                        keyExtractor={(item) => item.id}
                        style={styles.recipesList}
                        showsVerticalScrollIndicator={false}
                        refreshing={refreshing}
                        onRefresh={onRefresh}
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
    backButton: {
        padding: 8,
    },
    backButtonText: {
        fontSize: 16,
        color: '#FF6B35',
        fontWeight: '600',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2D2D2D',
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    stopAllButton: {
        backgroundColor: '#FF3B30',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    stopAllButtonText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
    refreshButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: '#FFF8F5',
    },
    refreshButtonText: {
        fontSize: 18,
        color: '#FF6B35',
    },
    voiceInstructions: {
        backgroundColor: '#FF6B35',
        padding: 12,
        marginHorizontal: 16,
        marginTop: 12,
        borderRadius: 12,
    },
    voiceInstructionsText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
    content: {
        flex: 1,
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
    speakingCard: {
        backgroundColor: '#FFF0EB',
        borderLeftColor: '#17a2b8',
        shadowColor: '#17a2b8',
        shadowOpacity: 0.3,
    },
    recipeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    titleContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginRight: 12,
    },
    recipeTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2D2D2D',
        flex: 1,
        marginRight: 8,
    },
    voiceButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#FF6B35',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    voiceButtonActive: {
        backgroundColor: '#17a2b8',
    },
    voiceButtonIcon: {
        fontSize: 14,
        color: '#FFFFFF',
    },
    recipeAuthor: {
        fontSize: 12,
        color: '#FF6B35',
        fontWeight: '600',
        fontStyle: 'italic',
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
    voiceHint: {
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#FFE5D9',
    },
    voiceHintText: {
        fontSize: 11,
        color: '#FF6B35',
        fontStyle: 'italic',
        textAlign: 'center',
    },
    loadingText: {
        textAlign: 'center',
        color: '#666666',
        fontSize: 16,
        marginTop: 12,
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
    addRecipeButton: {
        backgroundColor: '#FF6B35',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    addRecipeButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    listContent: {
        paddingBottom: 20,
    },
});