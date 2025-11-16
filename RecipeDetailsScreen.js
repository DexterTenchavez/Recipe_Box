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

// Import Text-to-Speech
import * as Speech from 'expo-speech';

export default function RecipeDetailScreen({ route, navigation }) {
    const { recipe } = route.params;
    const currentUser = auth.currentUser;
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);

    // Stop speaking when component unmounts
    useEffect(() => {
        return () => {
            Speech.stop();
        };
    }, []);

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

    const speakRecipe = async () => {
        try {
            if (isSpeaking) {
                Speech.stop();
                setIsSpeaking(false);
                setCurrentStep(0);
                return;
            }

            setIsSpeaking(true);
            
            // Create speech content
            let speechContent = `Recipe: ${recipe.title}. `;
            
            if (recipe.description) {
                speechContent += `Description: ${recipe.description}. `;
            }
            
            speechContent += `Preparation time: ${recipe.prepTime} minutes. Cook time: ${recipe.cookTime} minutes. Total time: ${recipe.totalTime} minutes. Servings: ${recipe.servings}. `;
            
            // Ingredients
            speechContent += 'Ingredients: ';
            recipe.ingredients.forEach((ingredient, index) => {
                speechContent += `${index + 1}. ${ingredient}. `;
            });
            
            // Instructions
            speechContent += 'Instructions: ';
            recipe.instructions.forEach((instruction, index) => {
                speechContent += `Step ${index + 1}. ${instruction}. `;
            });

            // Configure speech options
            const speechOptions = {
                language: 'en',
                pitch: 1.0,
                rate: 0.8, // Slightly slower for better comprehension
                onStart: () => setIsSpeaking(true),
                onDone: () => {
                    setIsSpeaking(false);
                    setCurrentStep(0);
                },
                onStopped: () => {
                    setIsSpeaking(false);
                    setCurrentStep(0);
                },
                onError: (error) => {
                    console.error('Speech error:', error);
                    setIsSpeaking(false);
                    setCurrentStep(0);
                    Alert.alert('Speech Error', 'Failed to read recipe: ' + error);
                }
            };

            await Speech.speak(speechContent, speechOptions);

        } catch (error) {
            console.error('Speech error:', error);
            setIsSpeaking(false);
            setCurrentStep(0);
            Alert.alert('Error', 'Text-to-speech not available: ' + error.message);
        }
    };

    const speakInstructionsOnly = async () => {
        try {
            if (isSpeaking) {
                Speech.stop();
                setIsSpeaking(false);
                setCurrentStep(0);
                return;
            }

            setIsSpeaking(true);
            setCurrentStep(1);

            let instructionContent = 'Instructions for ' + recipe.title + '. ';
            recipe.instructions.forEach((instruction, index) => {
                instructionContent += `Step ${index + 1}. ${instruction}. `;
            });

            const speechOptions = {
                language: 'en',
                pitch: 1.0,
                rate: 0.8,
                onStart: () => setIsSpeaking(true),
                onDone: () => {
                    setIsSpeaking(false);
                    setCurrentStep(0);
                },
                onStopped: () => {
                    setIsSpeaking(false);
                    setCurrentStep(0);
                },
                onError: (error) => {
                    console.error('Speech error:', error);
                    setIsSpeaking(false);
                    setCurrentStep(0);
                }
            };

            await Speech.speak(instructionContent, speechOptions);

        } catch (error) {
            console.error('Speech error:', error);
            setIsSpeaking(false);
            setCurrentStep(0);
            Alert.alert('Error', 'Failed to read instructions: ' + error.message);
        }
    };

    const stopSpeaking = () => {
        Speech.stop();
        setIsSpeaking(false);
        setCurrentStep(0);
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
                                    isSpeaking && styles.voiceButtonActive
                                ]}
                                onPress={speakRecipe}
                            >
                                <Text style={styles.voiceButtonText}>
                                    {isSpeaking && currentStep === 0 ? '🔊' : '🔈'}
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
                        <Text style={styles.description}>{recipe.description}</Text>
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
                                isSpeaking && currentStep === 1 && styles.voiceControlButtonActive
                            ]}
                            onPress={speakInstructionsOnly}
                            disabled={isSpeaking && currentStep !== 1}
                        >
                            <Text style={styles.voiceControlButtonText}>
                                {isSpeaking && currentStep === 1 ? '🔊 Read Instructions' : '🔈 Read Instructions'}
                            </Text>
                        </TouchableOpacity>
                        
                        {isSpeaking && (
                            <TouchableOpacity 
                                style={styles.stopButton}
                                onPress={stopSpeaking}
                            >
                                <Text style={styles.stopButtonText}>⏹️ Stop</Text>
                            </TouchableOpacity>
                        )}
                    </View>

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
                                Speech.speak(`Ingredients: ${ingredientsText}`, {
                                    language: 'en',
                                    rate: 0.8
                                });
                            }}
                        >
                            <Text style={styles.sectionVoiceIcon}>🔈</Text>
                        </TouchableOpacity>
                    </View>
                    {recipe.ingredients.map((ingredient, index) => (
                        <View key={index} style={styles.ingredientItem}>
                            <Text style={styles.ingredientBullet}>•</Text>
                            <Text style={styles.ingredient}>{ingredient}</Text>
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
                                {isSpeaking && currentStep === 1 ? '🔊' : '🔈'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                    {recipe.instructions.map((instruction, index) => (
                        <View key={index} style={styles.instructionStep}>
                            <View style={styles.stepNumberContainer}>
                                <Text style={styles.stepNumber}>{index + 1}</Text>
                            </View>
                            <Text style={styles.instructionText}>{instruction}</Text>
                            <TouchableOpacity 
                                style={styles.stepVoiceButton}
                                onPress={() => {
                                    Speech.speak(`Step ${index + 1}. ${instruction}`, {
                                        language: 'en',
                                        rate: 0.8
                                    });
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
    instructionText: {
        fontSize: 16,
        color: '#2D2D2D',
        lineHeight: 24,
        flex: 1,
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