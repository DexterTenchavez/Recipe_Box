// RecipeDetailsScreen.js (Enhanced)
import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    ScrollView, 
    StyleSheet,
    TouchableOpacity, 
    Alert,
    Share,
    Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth } from './firebaseConfig';
import { FirebaseService } from './FirebaseService';
import { TTSService } from './TTSService';

export default function RecipeDetailScreen({ route, navigation }) {
    const { recipe } = route.params;
    const currentUser = auth.currentUser;
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [highlightedSentence, setHighlightedSentence] = useState('');
    const [ttsState, setTtsState] = useState({});

    // Stop speaking when component unmounts
    useEffect(() => {
        return () => {
            TTSService.stop();
        };
    }, []);

    // Update TTS state
    useEffect(() => {
        const interval = setInterval(() => {
            const state = TTSService.getCurrentState();
            setTtsState(state);
            setIsSpeaking(state.isSpeaking);
            setIsPaused(state.isPaused);
        }, 100);

        return () => clearInterval(interval);
    }, []);

    const handleHighlight = (index, sentence) => {
        setHighlightedSentence(sentence);
        if (index === -1) {
            setHighlightedSentence('');
        }
    };

   const speakRecipe = async () => {
    const recipeText = `
        Recipe: ${recipe.title}. 
        ${recipe.description ? `Description: ${recipe.description}. ` : ''}
        Preparation time: ${recipe.prepTime || 0} minutes. 
        Cook time: ${recipe.cookTime || 0} minutes. 
        Total time: ${recipe.totalTime || 0} minutes. 
        Servings: ${recipe.servings || 1}. 
        Ingredients: ${recipe.ingredients.map((ing, idx) => `Ingredient ${idx + 1}: ${ing}`).join('. ')}.
        Instructions: ${recipe.instructions.map((inst, idx) => `Step ${idx + 1}: ${inst}`).join('. ')}.
    `.trim();

    await TTSService.speakWithHighlight(recipeText, handleHighlight);
};

const speakInstructionsOnly = async () => {
    const instructionsText = recipe.instructions.map((inst, idx) => 
        `Step ${idx + 1}: ${inst}`
    ).join('. ');

    await TTSService.speakWithHighlight(instructionsText, handleHighlight);
};

    const handlePauseResume = () => {
        if (isPaused) {
            TTSService.resume();
        } else {
            TTSService.pause();
        }
    };

    const stopSpeaking = () => {
        TTSService.stop();
    };

    const handleShareRecipe = async () => {
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

    const handleTogglePublish = async () => {
        try {
            if (recipe.isShared) {
                await FirebaseService.unshareRecipe(recipe.id);
                Alert.alert('Success', 'Recipe is now private');
            } else {
                await FirebaseService.shareRecipe(recipe.id);
                Alert.alert('Success', 'Recipe is now public!');
            }
            navigation.setParams({
                recipe: {
                    ...recipe,
                    isShared: !recipe.isShared
                }
            });
        } catch (error) {
            Alert.alert('Error', 'Failed to update recipe: ' + error.message);
        }
    };

    const handleDeleteRecipe = () => {
        Alert.alert(
            'Delete Recipe',
            `Are you sure you want to delete "${recipe.title}"? This will also remove it from all pinned lists.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await FirebaseService.deleteRecipe(recipe.id);
                            Alert.alert('Success', 'Recipe deleted successfully!');
                            navigation.goBack();
                        } catch (error) {
                            console.error('Delete error:', error);
                            Alert.alert('Error', 'Failed to delete recipe: ' + error.message);
                        }
                    }
                }
            ]
        );
    };

    // Highlight text function
   // Highlight text function - more flexible matching
const HighlightedText = ({ text, highlight }) => {
    if (!highlight || !text) {
        return <Text style={styles.normalText}>{text}</Text>;
    }

    // Clean the highlight text for better matching
    const cleanHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').trim();
    
    // Try to find the highlight in the text
    const index = text.toLowerCase().indexOf(cleanHighlight.toLowerCase());
    
    if (index === -1) {
        return <Text style={styles.normalText}>{text}</Text>;
    }

    const before = text.substring(0, index);
    const matched = text.substring(index, index + cleanHighlight.length);
    const after = text.substring(index + cleanHighlight.length);

    return (
        <Text style={styles.normalText}>
            {before}
            <Text style={styles.highlightedText}>{matched}</Text>
            {after}
        </Text>
    );
};

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Header Section */}
                <View style={styles.header}>
                    <View style={styles.headerTop}>
                        <Text style={styles.title}>{recipe.title}</Text>
                        <View style={styles.actionButtons}>
                            {/* Voice Controls */}
                            <TouchableOpacity 
                                style={[
                                    styles.voiceButton,
                                    isSpeaking && styles.voiceButtonActive,
                                    isPaused && styles.voiceButtonPaused
                                ]}
                                onPress={speakRecipe}
                            >
                                <Text style={styles.voiceButtonText}>
                                    {isPaused ? '⏸️' : (isSpeaking ? '🔊' : '🔈')}
                                </Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity 
                                style={styles.shareButton}
                                onPress={handleShareRecipe}
                            >
                                <Text style={styles.shareButtonText}>Share</Text>
                            </TouchableOpacity>
                            
                            {currentUser?.uid === recipe.userId && (
                                <TouchableOpacity 
                                    style={[
                                        styles.publishButton,
                                        recipe.isShared && styles.unpublishButton
                                    ]}
                                    onPress={handleTogglePublish}
                                >
                                    <Text style={styles.publishButtonText}>
                                        {recipe.isShared ? 'Public' : 'Make Public'}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                    
                    {recipe.description && (
                        <HighlightedText 
                            text={recipe.description} 
                            highlight={highlightedSentence}
                        />
                    )}
                    
                    <View style={styles.metaInfo}>
                        <View style={styles.metaItem}>
                            <Text style={styles.metaIcon}>⏱️</Text>
                            <Text style={styles.metaText}>Prep: {recipe.prepTime}m</Text>
                        </View>
                        <View style={styles.metaItem}>
                            <Text style={styles.metaIcon}>🍳</Text>
                            <Text style={styles.metaText}>Cook: {recipe.cookTime}m</Text>
                        </View>
                        <View style={styles.metaItem}>
                            <Text style={styles.metaIcon}>👥</Text>
                            <Text style={styles.metaText}>{recipe.servings} servings</Text>
                        </View>
                        <View style={styles.metaItem}>
                            <Text style={styles.metaIcon}>⏰</Text>
                            <Text style={styles.metaText}>Total: {recipe.totalTime}m</Text>
                        </View>
                    </View>

                    {/* Voice Control Bar */}
                    <View style={styles.voiceControlBar}>
                        <TouchableOpacity 
                            style={[
                                styles.voiceControlButton,
                                isSpeaking && styles.voiceControlButtonActive
                            ]}
                            onPress={speakInstructionsOnly}
                        >
                            <Text style={styles.voiceControlButtonText}>
                                {isSpeaking ? '🔊 Instructions' : '🔈 Instructions'}
                            </Text>
                        </TouchableOpacity>
                        
                        {isSpeaking && (
                            <TouchableOpacity 
                                style={styles.pauseButton}
                                onPress={handlePauseResume}
                            >
                                <Text style={styles.pauseButtonText}>
                                    {isPaused ? '▶️ Resume' : '⏸️ Pause'}
                                </Text>
                            </TouchableOpacity>
                        )}
                        
                        {isSpeaking && (
                            <TouchableOpacity 
                                style={styles.stopButton}
                                onPress={stopSpeaking}
                            >
                                <Text style={styles.stopButtonText}>⏹️ Stop</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Current Speaking Indicator */}
                    {highlightedSentence && (
                        <View style={styles.highlightContainer}>
                            <Text style={styles.highlightLabel}>Now Speaking:</Text>
                            <Text style={styles.highlightedSentence}>{highlightedSentence}</Text>
                        </View>
                    )}

                    {recipe.userName && (
                        <View style={styles.authorContainer}>
                            <Text style={styles.recipeAuthor}>
                                Created by: {recipe.userName}
                            </Text>
                        </View>
                    )}

                    {recipe.tags && recipe.tags.length > 0 && (
                        <View style={styles.tagsContainer}>
                            {recipe.tags.map((tag, index) => (
                                <View key={index} style={styles.tag}>
                                    <Text style={styles.tagText}>#{tag}</Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {currentUser?.uid === recipe.userId && (
                        <TouchableOpacity 
                            style={styles.deleteButton}
                            onPress={handleDeleteRecipe}
                        >
                            <Text style={styles.deleteButtonText}>Delete Recipe</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Ingredients Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionIcon}>📋</Text>
                        <Text style={styles.sectionTitle}>Ingredients</Text>
                        <TouchableOpacity 
                            style={styles.sectionVoiceButton}
                            onPress={() => {
                                const ingredientsText = recipe.ingredients.map((ing, idx) => 
                                    `${idx + 1}. ${ing}`
                                ).join('. ');
                                TTSService.speakWithHighlight(ingredientsText, handleHighlight);
                            }}
                        >
                            <Text style={styles.sectionVoiceIcon}>🔈</Text>
                        </TouchableOpacity>
                    </View>
                    {recipe.ingredients.map((ingredient, index) => (
                        <View key={index} style={styles.ingredientItem}>
                            <Text style={styles.ingredientBullet}>•</Text>
                            <HighlightedText 
                                text={ingredient} 
                                highlight={highlightedSentence}
                                style={styles.ingredient}
                            />
                        </View>
                    ))}
                </View>

                {/* Instructions Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionIcon}>👩‍🍳</Text>
                        <Text style={styles.sectionTitle}>Instructions</Text>
                        <TouchableOpacity 
                            style={styles.sectionVoiceButton}
                            onPress={speakInstructionsOnly}
                        >
                            <Text style={styles.sectionVoiceIcon}>
                                {isSpeaking ? '🔊' : '🔈'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                    {recipe.instructions.map((instruction, index) => (
                        <View key={index} style={styles.instructionStep}>
                            <View style={styles.stepNumberContainer}>
                                <Text style={styles.stepNumber}>{index + 1}</Text>
                            </View>
                            <View style={styles.instructionTextContainer}>
                                <HighlightedText 
                                    text={instruction} 
                                    highlight={highlightedSentence}
                                    style={styles.instructionText}
                                />
                            </View>
                            <TouchableOpacity 
                                style={styles.stepVoiceButton}
                                onPress={() => {
                                    TTSService.speakWithHighlight(
                                        `Step ${index + 1}. ${instruction}`,
                                        handleHighlight
                                    );
                                }}
                            >
                                <Text style={styles.stepVoiceIcon}>🔈</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF8F5',
    },
    scrollView: {
        flex: 1,
    },
    header: {
        backgroundColor: '#FFFFFF',
        padding: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#FFE5D9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#2D2D2D',
        flex: 1,
        marginRight: 16,
        lineHeight: 32,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'flex-start',
    },
    voiceButton: {
        backgroundColor: '#FF6B35',
        width: 44,
        height: 44,
        borderRadius: 22,
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
    voiceButtonPaused: {
        backgroundColor: '#FFA500',
    },
    voiceButtonText: {
        fontSize: 18,
        color: '#FFFFFF',
    },
    shareButton: {
        backgroundColor: '#17a2b8',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    shareButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
    },
    publishButton: {
        backgroundColor: '#FF6B35',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    unpublishButton: {
        backgroundColor: '#666666',
    },
    publishButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
    },
    normalText: {
        fontSize: 16,
        color: '#666666',
        lineHeight: 24,
    },
    highlightedText: {
        backgroundColor: '#FFD700',
        color: '#2D2D2D',
        fontWeight: '600',
        paddingHorizontal: 4,
        borderRadius: 4,
    },
    description: {
        fontSize: 16,
        color: '#666666',
        marginBottom: 20,
        lineHeight: 24,
    },
    metaInfo: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 16,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF8F5',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        gap: 6,
        borderWidth: 1,
        borderColor: '#FFE5D9',
    },
    metaIcon: {
        fontSize: 14,
    },
    metaText: {
        fontSize: 14,
        color: '#2D2D2D',
        fontWeight: '500',
    },
    voiceControlBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        padding: 12,
        backgroundColor: '#FFF8F5',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FFE5D9',
    },
    voiceControlButton: {
        flex: 1,
        backgroundColor: '#FF6B35',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 10,
        marginRight: 8,
        alignItems: 'center',
    },
    voiceControlButtonActive: {
        backgroundColor: '#17a2b8',
    },
    voiceControlButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
    },
    pauseButton: {
        backgroundColor: '#FFA500',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 10,
        marginRight: 8,
        alignItems: 'center',
    },
    pauseButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
    },
    stopButton: {
        backgroundColor: '#FF3B30',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 10,
        alignItems: 'center',
    },
    stopButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
    },
    highlightContainer: {
        backgroundColor: '#FFF0EB',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#FF6B35',
    },
    highlightLabel: {
        fontSize: 12,
        color: '#FF6B35',
        fontWeight: '600',
        marginBottom: 4,
    },
    highlightedSentence: {
        fontSize: 14,
        color: '#2D2D2D',
        fontWeight: '500',
        fontStyle: 'italic',
    },
    authorContainer: {
        marginBottom: 16,
    },
    recipeAuthor: {
        fontSize: 14,
        color: '#FF6B35',
        fontWeight: '600',
        fontStyle: 'italic',
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    tag: {
        backgroundColor: '#FF6B35',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    tagText: {
        fontSize: 12,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    deleteButton: {
        backgroundColor: '#FF3B30',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    deleteButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 16,
    },
    section: {
        backgroundColor: '#FFFFFF',
        marginTop: 8,
        padding: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#FFE5D9',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        gap: 12,
    },
    sectionIcon: {
        fontSize: 20,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#2D2D2D',
        flex: 1,
    },
    sectionVoiceButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: '#FFF8F5',
    },
    sectionVoiceIcon: {
        fontSize: 16,
        color: '#FF6B35',
    },
    ingredientItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
        gap: 12,
    },
    ingredientBullet: {
        fontSize: 16,
        color: '#FF6B35',
        fontWeight: 'bold',
        marginTop: 2,
    },
    ingredient: {
        fontSize: 16,
        color: '#2D2D2D',
        lineHeight: 22,
        flex: 1,
    },
    instructionStep: {
        flexDirection: 'row',
        marginBottom: 20,
        gap: 16,
        alignItems: 'flex-start',
    },
    stepNumberContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#FF6B35',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 2,
    },
    stepNumber: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    instructionTextContainer: {
        flex: 1,
    },
    instructionText: {
        fontSize: 16,
        color: '#2D2D2D',
        lineHeight: 24,
    },
    stepVoiceButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: '#FFF8F5',
        marginTop: 2,
    },
    stepVoiceIcon: {
        fontSize: 14,
        color: '#FF6B35',
    },
});