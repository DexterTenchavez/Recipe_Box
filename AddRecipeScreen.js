import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FirebaseService } from './FirebaseService';

export default function AddRecipeScreen({ navigation }) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [prepTime, setPrepTime] = useState('');
    const [cookTime, setCookTime] = useState('');
    const [servings, setServings] = useState('');
    const [ingredients, setIngredients] = useState(['']);
    const [instructions, setInstructions] = useState(['']);
    const [tags, setTags] = useState([]);
    const [newTag, setNewTag] = useState('');
    const [loading, setLoading] = useState(false);

    const addIngredient = () => {
        setIngredients([...ingredients, '']);
    };

    const updateIngredient = (index, value) => {
        const newIngredients = [...ingredients];
        newIngredients[index] = value;
        setIngredients(newIngredients);
    };

    const removeIngredient = (index) => {
        if (ingredients.length > 1) {
            const newIngredients = ingredients.filter((_, i) => i !== index);
            setIngredients(newIngredients);
        }
    };

    const addInstruction = () => {
        setInstructions([...instructions, '']);
    };

    const updateInstruction = (index, value) => {
        const newInstructions = [...instructions];
        newInstructions[index] = value;
        setInstructions(newInstructions);
    };

    const removeInstruction = (index) => {
        if (instructions.length > 1) {
            const newInstructions = instructions.filter((_, i) => i !== index);
            setInstructions(newInstructions);
        }
    };

    const addTag = () => {
        if (newTag.trim() && !tags.includes(newTag.trim())) {
            setTags([...tags, newTag.trim()]);
            setNewTag('');
        }
    };

    const removeTag = (index) => {
        const newTags = tags.filter((_, i) => i !== index);
        setTags(newTags);
    };

    const handleSaveRecipe = async () => {
        if (!title.trim()) {
            Alert.alert('Error', 'Please enter a recipe title');
            return;
        }

        const filteredIngredients = ingredients.filter(ing => ing.trim());
        const filteredInstructions = instructions.filter(inst => inst.trim());

        if (filteredIngredients.length === 0) {
            Alert.alert('Error', 'Please add at least one ingredient');
            return;
        }

        if (filteredInstructions.length === 0) {
            Alert.alert('Error', 'Please add at least one instruction');
            return;
        }

        setLoading(true);
        try {
            const recipeData = {
                title: title.trim(),
                description: description.trim(),
                prepTime: parseInt(prepTime) || 0,
                cookTime: parseInt(cookTime) || 0,
                servings: parseInt(servings) || 1,
                ingredients: filteredIngredients,
                instructions: filteredInstructions,
                tags: tags,
                totalTime: (parseInt(prepTime) || 0) + (parseInt(cookTime) || 0),
                hasImage: false // Always false since we removed image picker
            };

            await FirebaseService.addRecipe(recipeData);

            Alert.alert(
                'Success', 
                'Recipe added successfully!',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        } catch (error) {
            Alert.alert('Error', 'Failed to save recipe: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const validateForm = () => {
        if (!title.trim()) return false;
        if (ingredients.filter(ing => ing.trim()).length === 0) return false;
        if (instructions.filter(inst => inst.trim()).length === 0) return false;
        return true;
    };

    const isFormValid = validateForm();

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardAvoid}
            >
                <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Add New Recipe</Text>
                        <Text style={styles.subtitle}>Create and share your delicious recipe</Text>
                    </View>

                    {/* Recipe Title */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Recipe Title *</Text>
                        <TextInput
                            style={styles.textInput}
                            placeholder="Enter recipe title"
                            placeholderTextColor="#999"
                            value={title}
                            onChangeText={setTitle}
                            editable={!loading}
                            maxLength={100}
                        />
                        <Text style={styles.charCount}>
                            {title.length}/100 characters
                        </Text>
                    </View>

                    {/* Description */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Description</Text>
                        <TextInput
                            style={[styles.textInput, styles.textArea]}
                            placeholder="Brief description of your recipe..."
                            placeholderTextColor="#999"
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            numberOfLines={3}
                            editable={!loading}
                            maxLength={500}
                        />
                        <Text style={styles.charCount}>
                            {description.length}/500 characters
                        </Text>
                    </View>

                    {/* Times and Servings */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Cooking Details</Text>
                        <View style={styles.rowInputs}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Prep Time (min)</Text>
                                <TextInput
                                    style={styles.smallInput}
                                    placeholder="15"
                                    placeholderTextColor="#999"
                                    value={prepTime}
                                    onChangeText={setPrepTime}
                                    keyboardType="numeric"
                                    editable={!loading}
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Cook Time (min)</Text>
                                <TextInput
                                    style={styles.smallInput}
                                    placeholder="30"
                                    placeholderTextColor="#999"
                                    value={cookTime}
                                    onChangeText={setCookTime}
                                    keyboardType="numeric"
                                    editable={!loading}
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Servings</Text>
                                <TextInput
                                    style={styles.smallInput}
                                    placeholder="4"
                                    placeholderTextColor="#999"
                                    value={servings}
                                    onChangeText={setServings}
                                    keyboardType="numeric"
                                    editable={!loading}
                                />
                            </View>
                        </View>
                        {(prepTime || cookTime) && (
                            <Text style={styles.totalTime}>
                                Total Time: {(parseInt(prepTime) || 0) + (parseInt(cookTime) || 0)} minutes
                            </Text>
                        )}
                    </View>

                    {/* Ingredients */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Ingredients *</Text>
                        <Text style={styles.hint}>Add at least one ingredient</Text>
                        {ingredients.map((ingredient, index) => (
                            <View key={index} style={styles.listItem}>
                                <View style={styles.ingredientNumber}>
                                    <Text style={styles.ingredientNumberText}>{index + 1}</Text>
                                </View>
                                <TextInput
                                    style={[styles.textInput, styles.listInput]}
                                    placeholder={`Ingredient ${index + 1} (e.g., 2 cups flour)`}
                                    placeholderTextColor="#999"
                                    value={ingredient}
                                    onChangeText={(text) => updateIngredient(index, text)}
                                    editable={!loading}
                                    multiline
                                />
                                {ingredients.length > 1 && (
                                    <TouchableOpacity 
                                        style={styles.removeButton}
                                        onPress={() => removeIngredient(index)}
                                        disabled={loading}
                                    >
                                        <Text style={styles.removeButtonText}>×</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        ))}
                        <TouchableOpacity 
                            style={styles.addButton} 
                            onPress={addIngredient}
                            disabled={loading}
                        >
                            <Text style={styles.addButtonText}>+ Add Ingredient</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Instructions */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Instructions *</Text>
                        <Text style={styles.hint}>Add step-by-step instructions</Text>
                        {instructions.map((instruction, index) => (
                            <View key={index} style={styles.listItem}>
                                <View style={styles.stepNumberContainer}>
                                    <Text style={styles.stepNumber}>{index + 1}</Text>
                                </View>
                                <TextInput
                                    style={[styles.textInput, styles.listInput]}
                                    placeholder={`Step ${index + 1} (e.g., Preheat oven to 350°F)`}
                                    placeholderTextColor="#999"
                                    value={instruction}
                                    onChangeText={(text) => updateInstruction(index, text)}
                                    multiline
                                    editable={!loading}
                                />
                                {instructions.length > 1 && (
                                    <TouchableOpacity 
                                        style={styles.removeButton}
                                        onPress={() => removeInstruction(index)}
                                        disabled={loading}
                                    >
                                        <Text style={styles.removeButtonText}>×</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        ))}
                        <TouchableOpacity 
                            style={styles.addButton} 
                            onPress={addInstruction}
                            disabled={loading}
                        >
                            <Text style={styles.addButtonText}>+ Add Step</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Tags */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Tags</Text>
                        <Text style={styles.hint}>Add tags to help others find your recipe</Text>
                        <View style={styles.tagInputContainer}>
                            <TextInput
                                style={[styles.textInput, styles.tagInput]}
                                placeholder="Add a tag (e.g., vegetarian, quick, spicy)"
                                placeholderTextColor="#999"
                                value={newTag}
                                onChangeText={setNewTag}
                                onSubmitEditing={addTag}
                                editable={!loading}
                                returnKeyType="done"
                            />
                            <TouchableOpacity 
                                style={[styles.addTagButton, (!newTag.trim() || loading) && styles.disabledButton]} 
                                onPress={addTag}
                                disabled={!newTag.trim() || loading}
                            >
                                <Text style={styles.addTagButtonText}>Add</Text>
                            </TouchableOpacity>
                        </View>
                        {tags.length > 0 && (
                            <View style={styles.tagsContainer}>
                                {tags.map((tag, index) => (
                                    <View key={index} style={styles.tag}>
                                        <Text style={styles.tagText}>{tag}</Text>
                                        <TouchableOpacity 
                                            onPress={() => removeTag(index)}
                                            disabled={loading}
                                        >
                                            <Text style={styles.tagRemove}>×</Text>
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>

                    {/* Buttons */}
                    <View style={styles.buttonsContainer}>
                        <TouchableOpacity 
                            style={[styles.button, styles.cancelButton]}
                            onPress={() => navigation.goBack()}
                            disabled={loading}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[
                                styles.button, 
                                styles.saveButton, 
                                (!isFormValid || loading) && styles.disabledButton
                            ]}
                            onPress={handleSaveRecipe}
                            disabled={!isFormValid || loading}
                        >
                            <Text style={styles.saveButtonText}>
                                {loading ? 'Saving...' : 'Save Recipe'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Form Status */}
                    {!isFormValid && (
                        <View style={styles.formStatus}>
                            <Text style={styles.formStatusText}>
                                Please fill in all required fields (title, ingredients, and instructions)
                            </Text>
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF8F5',
    },
    keyboardAvoid: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    header: {
        padding: 24,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#FFE5D9',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#2D2D2D',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#666666',
        textAlign: 'center',
    },
    section: {
        backgroundColor: '#FFFFFF',
        marginBottom: 8,
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#FFE5D9',
    },
    label: {
        fontSize: 18,
        fontWeight: '600',
        color: '#2D2D2D',
        marginBottom: 4,
    },
    hint: {
        fontSize: 14,
        color: '#666666',
        marginBottom: 12,
    },
    textInput: {
        borderWidth: 2,
        borderColor: '#FFE5D9',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        backgroundColor: '#FFFFFF',
        color: '#2D2D2D',
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    charCount: {
        fontSize: 12,
        color: '#999',
        textAlign: 'right',
        marginTop: 4,
    },
    rowInputs: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    inputGroup: {
        flex: 1,
    },
    inputLabel: {
        fontSize: 14,
        color: '#666666',
        marginBottom: 8,
        textAlign: 'center',
    },
    smallInput: {
        borderWidth: 2,
        borderColor: '#FFE5D9',
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#FFFFFF',
        color: '#2D2D2D',
        textAlign: 'center',
    },
    totalTime: {
        fontSize: 14,
        color: '#FF6B35',
        fontWeight: '600',
        textAlign: 'center',
        marginTop: 8,
        fontStyle: 'italic',
    },
    // List Items
    listItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
        gap: 12,
    },
    ingredientNumber: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#28a745',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 12,
    },
    ingredientNumberText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    stepNumberContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#FF6B35',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
    },
    stepNumber: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    listInput: {
        flex: 1,
        marginRight: 8,
        minHeight: 50,
    },
    removeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#FF3B30',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
    },
    removeButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
        lineHeight: 18,
    },
    addButton: {
        backgroundColor: '#FF6B35',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    addButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    // Tags
    tagInputContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    tagInput: {
        flex: 1,
    },
    addTagButton: {
        backgroundColor: '#FF6B35',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderRadius: 12,
        justifyContent: 'center',
    },
    addTagButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    tag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FF6B35',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        gap: 8,
    },
    tagText: {
        fontSize: 14,
        color: '#FFFFFF',
        fontWeight: '500',
    },
    tagRemove: {
        fontSize: 16,
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
    // Buttons
    buttonsContainer: {
        flexDirection: 'row',
        gap: 12,
        padding: 20,
        backgroundColor: '#FFFFFF',
    },
    button: {
        flex: 1,
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    cancelButton: {
        backgroundColor: '#6c757d',
    },
    cancelButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    saveButton: {
        backgroundColor: '#FF6B35',
    },
    disabledButton: {
        backgroundColor: '#FFA375',
        opacity: 0.7,
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    // Form Status
    formStatus: {
        padding: 16,
        backgroundColor: '#FFF3CD',
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#FFC107',
    },
    formStatusText: {
        fontSize: 14,
        color: '#856404',
        textAlign: 'center',
    },
});