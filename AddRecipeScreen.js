import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    SafeAreaView,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { FirebaseService } from './FirebaseService';
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebaseConfig";



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


    // Add this temporary test in your component
useEffect(() => {
    console.log("AddRecipeScreen mounted - checking FirebaseService");
}, []);

    const removeTag = (index) => {
        const newTags = tags.filter((_, i) => i !== index);
        setTags(newTags);
    };

 const handleSaveRecipe = async () => {
    // Validation checks
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
            // Note: FirebaseService.addRecipe should add userId, createdAt, etc.
        };

        console.log('📝 Saving recipe:', recipeData.title);
        await FirebaseService.addRecipe(recipeData);

        Alert.alert(
            'Success 🎉', 
            'Recipe added successfully!',
            [{ 
                text: 'OK', 
                onPress: () => {
                    // Reset form and navigate back
                    setTitle('');
                    setDescription('');
                    setPrepTime('');
                    setCookTime('');
                    setServings('');
                    setIngredients(['']);
                    setInstructions(['']);
                    setTags([]);
                    navigation.goBack();
                }
            }]
        );
    } catch (error) {
        console.error('❌ Error saving recipe:', error);
        let errorMessage = 'Failed to save recipe. Please try again.';
        
        if (error.message.includes('permission')) {
            errorMessage = 'Permission denied. Please check if you are logged in.';
        } else if (error.message.includes('network') || error.message.includes('offline')) {
            errorMessage = 'Network error. Please check your internet connection.';
        } else if (error.message.includes('quota')) {
            errorMessage = 'Storage limit exceeded. Please try again later.';
        }
        
        Alert.alert('Error', errorMessage);
    } finally {
        setLoading(false);
    }
};
    
   

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardAvoid}
            >
                <ScrollView style={styles.scrollView}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Add New Recipe</Text>
                    </View>

                    {/* Recipe Title */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Recipe Title *</Text>
                        <TextInput
                            style={styles.textInput}
                            placeholder="Enter recipe title"
                            value={title}
                            onChangeText={setTitle}
                            placeholderTextColor="#999"
                        />
                    </View>

                    {/* Description */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Description</Text>
                        <TextInput
                            style={[styles.textInput, styles.textArea]}
                            placeholder="Brief description of your recipe"
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            numberOfLines={3}
                            placeholderTextColor="#999"
                        />
                    </View>

                    {/* Times and Servings */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Prep Time (min)    Cook Time (min)    Servings</Text>
                        <View style={styles.rowInputs}>
                            <TextInput
                                style={[styles.textInput, styles.smallInput]}
                                placeholder="15"
                                value={prepTime}
                                onChangeText={setPrepTime}
                                keyboardType="numeric"
                                placeholderTextColor="#999"
                            />
                            <TextInput
                                style={[styles.textInput, styles.smallInput]}
                                placeholder="30"
                                value={cookTime}
                                onChangeText={setCookTime}
                                keyboardType="numeric"
                                placeholderTextColor="#999"
                            />
                            <TextInput
                                style={[styles.textInput, styles.smallInput]}
                                placeholder="4"
                                value={servings}
                                onChangeText={setServings}
                                keyboardType="numeric"
                                placeholderTextColor="#999"
                            />
                        </View>
                    </View>

                    {/* Ingredients */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Ingredients *</Text>
                        {ingredients.map((ingredient, index) => (
                            <View key={index} style={styles.listItem}>
                                <TextInput
                                    style={[styles.textInput, styles.listInput]}
                                    placeholder={`Ingredient ${index + 1}`}
                                    value={ingredient}
                                    onChangeText={(text) => updateIngredient(index, text)}
                                    placeholderTextColor="#999"
                                />
                                {ingredients.length > 1 && (
                                    <TouchableOpacity 
                                        style={styles.removeButton}
                                        onPress={() => removeIngredient(index)}
                                    >
                                        <Text style={styles.removeButtonText}>×</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        ))}
                        <TouchableOpacity style={styles.addButton} onPress={addIngredient}>
                            <Text style={styles.addButtonText}>+ Add Ingredient</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Instructions */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Instructions *</Text>
                        {instructions.map((instruction, index) => (
                            <View key={index} style={styles.listItem}>
                                <Text style={styles.stepNumber}>{index + 1}</Text>
                                <TextInput
                                    style={[styles.textInput, styles.listInput]}
                                    placeholder={`Step ${index + 1}`}
                                    value={instruction}
                                    onChangeText={(text) => updateInstruction(index, text)}
                                    multiline
                                    placeholderTextColor="#999"
                                />
                                {instructions.length > 1 && (
                                    <TouchableOpacity 
                                        style={styles.removeButton}
                                        onPress={() => removeInstruction(index)}
                                    >
                                        <Text style={styles.removeButtonText}>×</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        ))}
                        <TouchableOpacity style={styles.addButton} onPress={addInstruction}>
                            <Text style={styles.addButtonText}>+ Add Step</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Tags */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Tags</Text>
                        <View style={styles.tagInputContainer}>
                            <TextInput
                                style={[styles.textInput, styles.tagInput]}
                                placeholder="Add a tag"
                                value={newTag}
                                onChangeText={setNewTag}
                                placeholderTextColor="#999"
                                onSubmitEditing={addTag}
                            />
                            <TouchableOpacity style={styles.addTagButton} onPress={addTag}>
                                <Text style={styles.addTagButtonText}>Add</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.tagsContainer}>
                            {tags.map((tag, index) => (
                                <View key={index} style={styles.tag}>
                                    <Text style={styles.tagText}>{tag}</Text>
                                    <TouchableOpacity onPress={() => removeTag(index)}>
                                        <Text style={styles.tagRemove}>×</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* Buttons */}
                    <View style={styles.buttonsContainer}>
                        <TouchableOpacity 
                            style={[styles.button, styles.cancelButton]}
                            onPress={() => navigation.goBack()}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.button, styles.saveButton]}
                            onPress={handleSaveRecipe}
                        >
                            <Text style={styles.saveButtonText}>Save Recipe</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    keyboardAvoid: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    header: {
        padding: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#212529',
        textAlign: 'center',
    },
    section: {
        backgroundColor: '#fff',
        marginBottom: 8,
        padding: 16,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#212529',
        marginBottom: 8,
    },
    textInput: {
        borderWidth: 1,
        borderColor: '#dee2e6',
        borderRadius: 6,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#fff',
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    rowInputs: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8,
    },
    smallInput: {
        flex: 1,
        textAlign: 'center',
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    stepNumber: {
        width: 24,
        fontSize: 14,
        fontWeight: '600',
        color: '#6c757d',
        marginRight: 8,
    },
    listInput: {
        flex: 1,
        marginRight: 8,
    },
    removeButton: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#dc3545',
        justifyContent: 'center',
        alignItems: 'center',
    },
    removeButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        lineHeight: 16,
    },
    addButton: {
        backgroundColor: '#FF6B35',
        padding: 12,
        borderRadius: 6,
        alignItems: 'center',
        marginTop: 8,
    },
    addButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    tagInputContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    tagInput: {
        flex: 1,
    },
    addTagButton: {
        backgroundColor: '#6c757d',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 6,
        justifyContent: 'center',
    },
    addTagButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 8,
        gap: 8,
    },
    tag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e9ecef',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 4,
    },
    tagText: {
        fontSize: 14,
        color: '#495057',
    },
    tagRemove: {
        fontSize: 16,
        color: '#6c757d',
        fontWeight: 'bold',
    },
    buttonsContainer: {
        flexDirection: 'row',
        gap: 12,
        padding: 16,
        backgroundColor: '#fff',
    },
    button: {
        flex: 1,
        padding: 16,
        borderRadius: 6,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#6c757d',
    },
    cancelButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    saveButton: {
        backgroundColor: '#FF6B35',
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});