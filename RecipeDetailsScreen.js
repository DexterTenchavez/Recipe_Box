import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    ScrollView, 
    StyleSheet,
    TouchableOpacity, 
    Alert,
    Share
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth } from './firebaseConfig';
import { FirebaseService } from './FirebaseService';

// Import TTS directly - it should work after proper installation
import Tts from 'react-native-tts';

// Simple working TTS service
class WorkingTTSService {
    constructor() {
        this.isSpeaking = false;
        this.isPaused = false;
        this.ttsAvailable = false;
        this.initTTS();
    }

    async initTTS() {
        try {
            // Initialize TTS with basic settings
            await Tts.setDefaultLanguage('en-US');
            await Tts.setDefaultRate(0.5);
            this.ttsAvailable = true;
            console.log('✅ TTS WORKING!');
        } catch (error) {
            console.log('TTS not available, using fallback');
            this.ttsAvailable = false;
        }
    }

    async speak(text) {
        if (!this.ttsAvailable) {
            // Fallback: show text in alert
            Alert.alert('Recipe Reading', text.substring(0, 150) + '...');
            return;
        }

        try {
            this.isSpeaking = true;
            await Tts.speak(text);
        } catch (error) {
            console.log('TTS speak error, using fallback');
            Alert.alert('Recipe Reading', text.substring(0, 150) + '...');
        }
    }

    async stop() {
        try {
            await Tts.stop();
            this.isSpeaking = false;
        } catch (error) {
            console.log('TTS stop error');
        }
    }

    getCurrentState() {
        return {
            isSpeaking: this.isSpeaking,
            isPaused: this.isPaused,
            ttsAvailable: this.ttsAvailable
        };
    }
}

const TTSService = new WorkingTTSService();

export default function RecipeDetailScreen({ route, navigation }) {
    const { recipe } = route.params;
    const currentUser = auth.currentUser;
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [highlightedText, setHighlightedText] = useState('');
    const [ttsAvailable, setTtsAvailable] = useState(false);

    useEffect(() => {
        // Check TTS availability
        const state = TTSService.getCurrentState();
        setTtsAvailable(state.ttsAvailable);
        
        return () => {
            TTSService.stop();
        };
    }, []);

    // SPEAK FUNCTIONS WITH HIGHLIGHTING
    const speakRecipe = async () => {
        const sections = [
            `Recipe: ${recipe.title}`,
            recipe.description ? `Description: ${recipe.description}` : '',
            `Preparation time: ${recipe.prepTime} minutes`,
            `Cook time: ${recipe.cookTime} minutes`, 
            `Total time: ${recipe.totalTime} minutes`,
            `Servings: ${recipe.servings}`,
            `Ingredients: ${recipe.ingredients.join(', ')}`,
            `Instructions: ${recipe.instructions.join('. ')}`
        ].filter(section => section);

        for (const section of sections) {
            setHighlightedText(section);
            await TTSService.speak(section);
            // Small delay between sections
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        setHighlightedText('');
    };

    const speakIngredients = async () => {
        const ingredientsText = `Ingredients: ${recipe.ingredients.join(', ')}`;
        setHighlightedText(ingredientsText);
        await TTSService.speak(ingredientsText);
    };

    const speakInstructions = async () => {
        const instructionsText = `Instructions: ${recipe.instructions.join('. ')}`;
        setHighlightedText(instructionsText);
        await TTSService.speak(instructionsText);
    };

    const stopSpeaking = () => {
        TTSService.stop();
        setHighlightedText('');
    };

    // Highlight text component
    const HighlightedText = ({ text, highlight }) => {
        if (!highlight) return <Text style={styles.normalText}>{text}</Text>;
        
        return (
            <Text style={styles.normalText}>
                <Text style={styles.highlightedText}>{text}</Text>
            </Text>
        );
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

    const handleDeleteRecipe = () => {
        Alert.alert(
            'Delete Recipe',
            `Are you sure you want to delete "${recipe.title}"?`,
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
                            Alert.alert('Error', 'Failed to delete recipe');
                        }
                    }
                }
            ]
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
                            {/* SPEAKER BUTTON */}
                            <TouchableOpacity 
                                style={[
                                    styles.voiceButton,
                                    !ttsAvailable && styles.voiceButtonDisabled
                                ]}
                                onPress={speakRecipe}
                            >
                                <Text style={styles.voiceButtonText}>
                                    {ttsAvailable ? '🔊' : '🔇'}
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
                                    style={styles.deleteButton}
                                    onPress={handleDeleteRecipe}
                                >
                                    <Text style={styles.deleteButtonText}>Delete</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                    
                    {/* HIGHLIGHTED DESCRIPTION */}
                    {recipe.description && (
                        <HighlightedText 
                            text={recipe.description} 
                            highlight={highlightedText}
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
                    </View>

                    {/* CURRENTLY SPEAKING INDICATOR */}
                    {highlightedText && (
                        <View style={styles.highlightContainer}>
                            <Text style={styles.highlightLabel}>Now Speaking:</Text>
                            <Text style={styles.highlightedSentence}>{highlightedText}</Text>
                            <TouchableOpacity 
                                style={styles.stopButton}
                                onPress={stopSpeaking}
                            >
                                <Text style={styles.stopButtonText}>⏹️ Stop</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Ingredients Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionIcon}>📋</Text>
                        <Text style={styles.sectionTitle}>Ingredients</Text>
                        <TouchableOpacity 
                            style={[styles.sectionVoiceButton, !ttsAvailable && styles.voiceButtonDisabled]}
                            onPress={speakIngredients}
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
                            style={[styles.sectionVoiceButton, !ttsAvailable && styles.voiceButtonDisabled]}
                            onPress={speakInstructions}
                        >
                            <Text style={styles.sectionVoiceIcon}>🔈</Text>
                        </TouchableOpacity>
                    </View>
                    {recipe.instructions.map((instruction, index) => (
                        <View key={index} style={styles.instructionStep}>
                            <View style={styles.stepNumberContainer}>
                                <Text style={styles.stepNumber}>{index + 1}</Text>
                            </View>
                            <View style={styles.instructionTextContainer}>
                                <Text style={styles.instructionText}>{instruction}</Text>
                            </View>
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
    },
    voiceButtonDisabled: {
        backgroundColor: '#6c757d',
        opacity: 0.6,
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
    },
    shareButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
    },
    deleteButton: {
        backgroundColor: '#FF3B30',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
    },
    deleteButtonText: {
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
        marginBottom: 8,
    },
    stopButton: {
        backgroundColor: '#FF3B30',
        paddingVertical: 8,
        borderRadius: 8,
        alignItems: 'center',
    },
    stopButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 12,
    },
    section: {
        backgroundColor: '#FFFFFF',
        marginTop: 8,
        padding: 24,
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
});