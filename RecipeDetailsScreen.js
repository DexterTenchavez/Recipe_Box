import React, { useState, useEffect, useRef } from 'react';
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
import * as Speech from 'expo-speech';

export default function RecipeDetailScreen({ route, navigation }) {
    const { recipe } = route.params;
    const currentUser = auth.currentUser;
    
    // State for speech
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [currentSpeakingPart, setCurrentSpeakingPart] = useState('');
    const [speechProgress, setSpeechProgress] = useState(0);
    
    // Refs for speech control
    const speechQueue = useRef([]);
    const currentIndex = useRef(0);
    const isSpeakingRef = useRef(false);

    // Split recipe into speakable parts
    const recipeParts = [
        { 
            type: 'title', 
            text: `Recipe: ${recipe.title}`,
            section: 'header'
        },
        ...(recipe.description ? [{
            type: 'description',
            text: `Description: ${recipe.description}`,
            section: 'header'
        }] : []),
        {
            type: 'times',
            text: `Preparation time: ${recipe.prepTime} minutes. Cook time: ${recipe.cookTime} minutes. Total time: ${recipe.totalTime} minutes. Servings: ${recipe.servings}`,
            section: 'header'
        },
        {
            type: 'ingredients',
            text: `Ingredients: ${recipe.ingredients.join(', ')}`,
            section: 'ingredients'
        },
        {
            type: 'instructions', 
            text: `Instructions: ${recipe.instructions.join('. ')}`,
            section: 'instructions'
        }
    ];

    // Speak functions
    const speakRecipe = async () => {
        if (isSpeakingRef.current) {
            await stopSpeaking();
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        speechQueue.current = [...recipeParts];
        currentIndex.current = 0;
        await speakNextPart();
    };

    const speakIngredients = async () => {
        if (isSpeakingRef.current) {
            await stopSpeaking();
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        const ingredientsPart = recipeParts.find(part => part.type === 'ingredients');
        if (ingredientsPart) {
            speechQueue.current = [ingredientsPart];
            currentIndex.current = 0;
            await speakNextPart();
        }
    };

    const speakInstructions = async () => {
        if (isSpeakingRef.current) {
            await stopSpeaking();
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        const instructionsPart = recipeParts.find(part => part.type === 'instructions');
        if (instructionsPart) {
            speechQueue.current = [instructionsPart];
            currentIndex.current = 0;
            await speakNextPart();
        }
    };

    const speakNextPart = async () => {
        if (currentIndex.current >= speechQueue.current.length) {
            // Finished speaking all parts
            setIsSpeaking(false);
            isSpeakingRef.current = false;
            setCurrentSpeakingPart('');
            setSpeechProgress(0);
            return;
        }

        const currentPart = speechQueue.current[currentIndex.current];
        setCurrentSpeakingPart(currentPart.type);
        setSpeechProgress(((currentIndex.current + 1) / speechQueue.current.length) * 100);

        try {
            setIsSpeaking(true);
            isSpeakingRef.current = true;
            setIsPaused(false);

            await Speech.speak(currentPart.text, {
                language: 'en',
                pitch: 1.0,
                rate: 0.8,
                onDone: () => {
                    currentIndex.current++;
                    speakNextPart();
                },
                onStopped: () => {
                    setIsSpeaking(false);
                    isSpeakingRef.current = false;
                    setCurrentSpeakingPart('');
                },
                onError: (error) => {
                    console.log('Speech error:', error);
                    Alert.alert('Speech Error', 'Could not speak the text');
                    setIsSpeaking(false);
                    isSpeakingRef.current = false;
                }
            });
        } catch (error) {
            console.log('Speech error:', error);
            Alert.alert('Speech Error', 'Could not speak the text');
            setIsSpeaking(false);
            isSpeakingRef.current = false;
        }
    };

    const pauseSpeaking = async () => {
        try {
            await Speech.pause();
            setIsPaused(true);
        } catch (error) {
            console.log('Pause error:', error);
        }
    };

    const resumeSpeaking = async () => {
        try {
            await Speech.resume();
            setIsPaused(false);
        } catch (error) {
            console.log('Resume error:', error);
        }
    };

    const stopSpeaking = async () => {
        try {
            await Speech.stop();
            setIsSpeaking(false);
            isSpeakingRef.current = false;
            setIsPaused(false);
            setCurrentSpeakingPart('');
            setSpeechProgress(0);
            speechQueue.current = [];
            currentIndex.current = 0;
        } catch (error) {
            console.log('Stop error:', error);
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopSpeaking();
        };
    }, []);

    // Highlight components
    const HighlightableText = ({ text, section, children }) => {
        const isHighlighted = currentSpeakingPart === section;
        
        return (
            <View style={isHighlighted ? styles.highlightedContainer : null}>
                {children || <Text style={[styles.normalText, isHighlighted && styles.highlightedText]}>{text}</Text>}
            </View>
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
                        <HighlightableText section="title">
                            <Text style={styles.title}>{recipe.title}</Text>
                        </HighlightableText>
                        
                        <View style={styles.actionButtons}>
                            {/* Voice Control Buttons */}
                            {isSpeaking ? (
                                <>
                                    <TouchableOpacity 
                                        style={[styles.voiceButton, styles.pauseButton]}
                                        onPress={isPaused ? resumeSpeaking : pauseSpeaking}
                                    >
                                        <Text style={styles.voiceButtonText}>
                                            {isPaused ? '▶️' : '⏸️'}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={[styles.voiceButton, styles.stopButton]}
                                        onPress={stopSpeaking}
                                    >
                                        <Text style={styles.voiceButtonText}>⏹️</Text>
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <>
                                    <TouchableOpacity 
                                        style={styles.voiceButton}
                                        onPress={speakRecipe}
                                    >
                                        <Text style={styles.voiceButtonText}>🔊 All</Text>
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
                                </>
                            )}
                        </View>
                    </View>
                    
                    {/* Description */}
                    {recipe.description && (
                        <HighlightableText 
                            text={recipe.description} 
                            section="description" 
                        />
                    )}
                    
                    {/* Meta Info */}
                    <HighlightableText section="times">
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
                    </HighlightableText>

                    {/* Speech Progress */}
                    {isSpeaking && (
                        <View style={styles.speechContainer}>
                            <View style={styles.progressBar}>
                                <View 
                                    style={[
                                        styles.progressFill,
                                        { width: `${speechProgress}%` }
                                    ]} 
                                />
                            </View>
                            <Text style={styles.speechStatus}>
                                {currentSpeakingPart === 'title' && 'Speaking: Recipe Title'}
                                {currentSpeakingPart === 'description' && 'Speaking: Description'}
                                {currentSpeakingPart === 'times' && 'Speaking: Cooking Times'}
                                {currentSpeakingPart === 'ingredients' && 'Speaking: Ingredients'}
                                {currentSpeakingPart === 'instructions' && 'Speaking: Instructions'}
                                {isPaused && ' (Paused)'}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Ingredients Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionIcon}>📋</Text>
                        <Text style={styles.sectionTitle}>Ingredients</Text>
                        <TouchableOpacity 
                            style={styles.sectionVoiceButton}
                            onPress={speakIngredients}
                            disabled={isSpeaking}
                        >
                            <Text style={styles.sectionVoiceIcon}>🔈</Text>
                        </TouchableOpacity>
                    </View>
                    
                    <HighlightableText section="ingredients">
                        {recipe.ingredients.map((ingredient, index) => (
                            <View key={index} style={styles.ingredientItem}>
                                <Text style={styles.ingredientBullet}>•</Text>
                                <Text style={styles.ingredient}>{ingredient}</Text>
                            </View>
                        ))}
                    </HighlightableText>
                </View>

                {/* Instructions Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionIcon}>👩‍🍳</Text>
                        <Text style={styles.sectionTitle}>Instructions</Text>
                        <TouchableOpacity 
                            style={styles.sectionVoiceButton}
                            onPress={speakInstructions}
                            disabled={isSpeaking}
                        >
                            <Text style={styles.sectionVoiceIcon}>🔈</Text>
                        </TouchableOpacity>
                    </View>
                    
                    <HighlightableText section="instructions">
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
                    </HighlightableText>
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
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        minWidth: 60,
        alignItems: 'center',
    },
    pauseButton: {
        backgroundColor: '#17a2b8',
    },
    stopButton: {
        backgroundColor: '#FF3B30',
    },
    voiceButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
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
    highlightedContainer: {
        backgroundColor: '#FFF0EB',
        borderRadius: 8,
        padding: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#FF6B35',
    },
    highlightedText: {
        color: '#2D2D2D',
        fontWeight: '600',
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
    speechContainer: {
        backgroundColor: '#FFF0EB',
        padding: 12,
        borderRadius: 8,
        marginTop: 8,
    },
    progressBar: {
        height: 6,
        backgroundColor: '#FFE5D9',
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#FF6B35',
        borderRadius: 3,
    },
    speechStatus: {
        fontSize: 12,
        color: '#FF6B35',
        fontWeight: '600',
        textAlign: 'center',
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