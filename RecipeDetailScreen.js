// RecipeDetailScreen.js
import React from 'react';
import { 
    View, 
    Text, 
    ScrollView, 
    StyleSheet, 
    SafeAreaView, 
    TouchableOpacity, 
    Alert,
    Share 
} from 'react-native';
import { auth } from './firebaseConfig';
import { FirebaseService } from './FirebaseService';

export default function RecipeDetailScreen({ route, navigation }) {
    const { recipe } = route.params;
    const currentUser = auth.currentUser;

    const handleShareRecipe = async () => {
        try {
            // Format the recipe for sharing
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
                            Alert.alert('Error', 'Failed to delete recipe: ' + error.message);
                        }
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView style={styles.scrollView}>
                <View style={styles.header}>
                    <View style={styles.headerTop}>
                        <Text style={styles.title}>{recipe.title}</Text>
                        <View style={styles.actionButtons}>
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
                    
                    {recipe.description && (
                        <Text style={styles.description}>{recipe.description}</Text>
                    )}
                    
                    <View style={styles.metaInfo}>
                        <Text style={styles.metaText}>Prep: {recipe.prepTime}m</Text>
                        <Text style={styles.metaText}>Cook: {recipe.cookTime}m</Text>
                        <Text style={styles.metaText}>{recipe.servings} servings</Text>
                        <Text style={styles.metaText}>Total: {recipe.totalTime} minutes</Text>
                    </View>

                    {recipe.tags && recipe.tags.length > 0 && (
                        <View style={styles.tagsContainer}>
                            {recipe.tags.map((tag, index) => (
                                <View key={index} style={styles.tag}>
                                    <Text style={styles.tagText}>{tag}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Ingredients</Text>
                    {recipe.ingredients.map((ingredient, index) => (
                        <Text key={index} style={styles.ingredient}>• {ingredient}</Text>
                    ))}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Instructions</Text>
                    {recipe.instructions.map((instruction, index) => (
                        <View key={index} style={styles.instructionStep}>
                            <Text style={styles.stepNumber}>{index + 1}</Text>
                            <Text style={styles.instructionText}>{instruction}</Text>
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
        backgroundColor: '#f8f9fa',
    },
    scrollView: {
        flex: 1,
    },
    header: {
        backgroundColor: '#fff',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#212529',
        flex: 1,
        marginRight: 12,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    shareButton: {
        backgroundColor: '#28a745',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    shareButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
    deleteButton: {
        backgroundColor: '#dc3545',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    deleteButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
    description: {
        fontSize: 16,
        color: '#6c757d',
        marginBottom: 12,
        lineHeight: 22,
    },
    metaInfo: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 12,
    },
    metaText: {
        fontSize: 14,
        color: '#6c757d',
        backgroundColor: '#e9ecef',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    tag: {
        backgroundColor: '#FF6B35',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 16,
    },
    tagText: {
        fontSize: 12,
        color: '#fff',
        fontWeight: '600',
    },
    section: {
        backgroundColor: '#fff',
        marginTop: 8,
        padding: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#212529',
        marginBottom: 12,
    },
    ingredient: {
        fontSize: 16,
        color: '#495057',
        marginBottom: 6,
        lineHeight: 22,
    },
    instructionStep: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    stepNumber: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FF6B35',
        marginRight: 12,
        minWidth: 24,
    },
    instructionText: {
        fontSize: 16,
        color: '#495057',
        lineHeight: 22,
        flex: 1,
    },
});