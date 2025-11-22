import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Modal,
    Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertTitle, setAlertTitle] = useState('');
    const [alertMessage, setAlertMessage] = useState('');
    const [alertType, setAlertType] = useState('success');
    const [fadeAnim] = useState(new Animated.Value(0));
    const [scaleAnim] = useState(new Animated.Value(0.8));

    const showCustomAlert = (title, message, type = 'error') => {
        setAlertTitle(title);
        setAlertMessage(message);
        setAlertType(type);
        setAlertVisible(true);
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            })
        ]).start();
    };

    const hideCustomAlert = () => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 0.8,
                duration: 200,
                useNativeDriver: true,
            })
        ]).start(() => {
            setAlertVisible(false);
        });
    };

    const getAlertStyles = () => {
        switch (alertType) {
            case 'success':
                return {
                    backgroundColor: '#F0FDF4',
                    borderColor: '#BBF7D0',
                    icon: '✅',
                    titleColor: '#16A34A',
                    buttonColor: '#16A34A'
                };
            case 'error':
            default:
                return {
                    backgroundColor: '#FEF2F2',
                    borderColor: '#FECACA',
                    icon: '❌',
                    titleColor: '#DC2626',
                    buttonColor: '#DC2626'
                };
        }
    };

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

    useEffect(() => {
        console.log("AddRecipeScreen mounted - checking FirebaseService");
    }, []);

    const removeTag = (index) => {
        const newTags = tags.filter((_, i) => i !== index);
        setTags(newTags);
    };

    const handleSaveRecipe = async () => {
        if (!title.trim()) {
            showCustomAlert('Error', 'Please enter a recipe title');
            return;
        }

        const filteredIngredients = ingredients.filter(ing => ing.trim());
        const filteredInstructions = instructions.filter(inst => inst.trim());

        if (filteredIngredients.length === 0) {
            showCustomAlert('Error', 'Please add at least one ingredient');
            return;
        }

        if (filteredInstructions.length === 0) {
            showCustomAlert('Error', 'Please add at least one instruction');
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
            };

            console.log('📝 Saving recipe:', recipeData.title);
            await FirebaseService.addRecipe(recipeData);

            showCustomAlert('Success 🎉', 'Recipe added successfully!', 'success');
            
            setTimeout(() => {
                setTitle('');
                setDescription('');
                setPrepTime('');
                setCookTime('');
                setServings('');
                setIngredients(['']);
                setInstructions(['']);
                setTags([]);
                navigation.goBack();
            }, 2000);
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
            
            showCustomAlert('Error', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const alertStyles = getAlertStyles();

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

            <Modal
                visible={alertVisible}
                transparent
                animationType="none"
                onRequestClose={hideCustomAlert}
            >
                <View style={styles.alertOverlay}>
                    <Animated.View 
                        style={[
                            styles.alertContainer,
                            {
                                opacity: fadeAnim,
                                transform: [{ scale: scaleAnim }],
                                backgroundColor: alertStyles.backgroundColor,
                                borderColor: alertStyles.borderColor,
                            }
                        ]}
                    >
                        <View style={styles.alertContent}>
                            <View style={styles.alertHeader}>
                                <Text style={styles.alertIcon}>{alertStyles.icon}</Text>
                                <Text style={[styles.alertTitle, { color: alertStyles.titleColor }]}>
                                    {alertTitle}
                                </Text>
                                <TouchableOpacity onPress={hideCustomAlert} style={styles.closeButton}>
                                    <Text style={styles.closeIcon}>✕</Text>
                                </TouchableOpacity>
                            </View>
                            
                            <Text style={styles.alertMessage}>{alertMessage}</Text>
                            
                            <View style={styles.alertButtons}>
                                <TouchableOpacity 
                                    style={[styles.alertButton, { backgroundColor: alertStyles.buttonColor }]}
                                    onPress={hideCustomAlert}
                                >
                                    <Text style={styles.alertButtonText}>OK</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Animated.View>
                </View>
            </Modal>
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
    alertOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    alertContainer: {
        width: '90%',
        maxWidth: 400,
        borderRadius: 16,
        borderWidth: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    alertContent: {
        padding: 24,
    },
    alertHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    alertIcon: {
        fontSize: 24,
        marginRight: 12,
    },
    alertTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        flex: 1,
    },
    closeButton: {
        padding: 4,
    },
    closeIcon: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#6B7280',
    },
    alertMessage: {
        fontSize: 16,
        lineHeight: 22,
        color: '#374151',
        marginBottom: 24,
    },
    alertButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    alertButton: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
        minWidth: 80,
        alignItems: 'center',
    },
    alertButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});