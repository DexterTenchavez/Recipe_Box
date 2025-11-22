import React, { useEffect, useState } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    FlatList, 
    ActivityIndicator,
    TextInput,
    Animated,
    Easing,
    Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FirebaseService } from './FirebaseService';
import * as Speech from 'expo-speech';

const CustomAlert = ({ visible, title, message, type = 'warning', buttons = [], onClose }) => {
  const [show, setShow] = useState(visible);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.8)).current;

  React.useEffect(() => {
    if (visible) {
      setShow(true);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        })
      ]).start();
    } else {
      handleClose();
    }
  }, [visible]);

  const handleClose = () => {
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
      setShow(false);
      onClose?.();
    });
  };

  const getTypeStyles = () => {
    switch (type) {
      case 'error':
        return {
          backgroundColor: '#FEF2F2',
          borderColor: '#FECACA',
          icon: '❌',
          titleColor: '#DC2626'
        };
      case 'success':
        return {
          backgroundColor: '#F0FDF4',
          borderColor: '#BBF7D0',
          icon: '✅',
          titleColor: '#16A34A'
        };
      case 'info':
        return {
          backgroundColor: '#F0F9FF',
          borderColor: '#BAE6FD',
          icon: 'ℹ️',
          titleColor: '#0284C7'
        };
      case 'warning':
      default:
        return {
          backgroundColor: '#FFFBEB',
          borderColor: '#FDE68A',
          icon: '⚠️',
          titleColor: '#D97706'
        };
    }
  };

  const typeStyles = getTypeStyles();

  if (!show) return null;

  return (
    <Modal transparent visible={true} animationType="none">
      <View style={alertStyles.alertOverlay}>
        <Animated.View 
          style={[
            alertStyles.alertContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
              backgroundColor: typeStyles.backgroundColor,
              borderColor: typeStyles.borderColor,
            }
          ]}
        >
          <View style={alertStyles.alertContent}>
            <View style={alertStyles.alertHeader}>
              <Text style={alertStyles.alertIcon}>{typeStyles.icon}</Text>
              <Text style={[alertStyles.alertTitle, { color: typeStyles.titleColor }]}>
                {title}
              </Text>
            </View>
            
            <Text style={alertStyles.alertMessage}>{message}</Text>
            
            <View style={alertStyles.alertButtons}>
              {buttons.length === 0 ? (
                <TouchableOpacity 
                  style={[alertStyles.alertButton, alertStyles.alertButtonPrimary]}
                  onPress={handleClose}
                >
                  <Text style={alertStyles.alertButtonText}>OK</Text>
                </TouchableOpacity>
              ) : (
                buttons.map((button, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      alertStyles.alertButton,
                      button.style === 'cancel' ? alertStyles.alertButtonCancel : 
                      button.style === 'destructive' ? alertStyles.alertButtonDestructive : 
                      alertStyles.alertButtonPrimary
                    ]}
                    onPress={() => {
                      button.onPress?.();
                      handleClose();
                    }}
                  >
                    <Text style={alertStyles.alertButtonText}>
                      {button.text}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const alertStyles = StyleSheet.create({
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
  alertMessage: {
    fontSize: 16,
    lineHeight: 22,
    color: '#374151',
    marginBottom: 24,
  },
  alertButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  alertButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  alertButtonPrimary: {
    backgroundColor: '#FF6B35',
  },
  alertButtonCancel: {
    backgroundColor: '#6B7280',
  },
  alertButtonDestructive: {
    backgroundColor: '#DC2626',
  },
  alertButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default function PublicRecipesScreen({ navigation }) {
    const [recipes, setRecipes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [speakingRecipeId, setSpeakingRecipeId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [pinnedRecipes, setPinnedRecipes] = useState(new Set());
    const [showAlert, setShowAlert] = useState(false);
    const [alertTitle, setAlertTitle] = useState('');
    const [alertMessage, setAlertMessage] = useState('');
    const [alertType, setAlertType] = useState('warning');
    const [alertButtons, setAlertButtons] = useState([]);

    const showCustomAlert = (title, message, type = 'warning', buttons = []) => {
        setAlertTitle(title);
        setAlertMessage(message);
        setAlertType(type);
        setAlertButtons(buttons);
        setShowAlert(true);
    };

    useEffect(() => {
        loadPublicRecipes();
        
        return () => {
            Speech.stop();
        };
    }, []);

    const loadPublicRecipes = async () => {
        try {
            setLoading(true);
            const publicRecipes = await FirebaseService.getPublicRecipes();
            console.log('🔍 Public recipes found:', publicRecipes.length);
            console.log('📋 Public recipes data:', publicRecipes.map(r => ({ 
                id: r.id, 
                title: r.title, 
                isShared: r.isShared 
            })));
            
            setRecipes(publicRecipes);
            
            const pinned = await FirebaseService.getPinnedRecipes();
            const pinnedIds = new Set(pinned.map(recipe => recipe.originalRecipeId || recipe.id));
            setPinnedRecipes(pinnedIds);
        } catch (error) {
            console.error('❌ Error loading public recipes:', error);
            showCustomAlert('Error', 'Failed to load public recipes: ' + error.message, 'error');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadPublicRecipes();
    };

    const createTestPublicRecipe = async () => {
        try {
            const testRecipe = {
                title: "Test Public Recipe",
                description: "This is a test recipe to verify public recipes work",
                prepTime: 10,
                cookTime: 20,
                servings: 4,
                ingredients: ["Test ingredient 1", "Test ingredient 2"],
                instructions: ["Test instruction 1", "Test instruction 2"],
                tags: ["test", "public"],
                isShared: true
            };
            
            await FirebaseService.addRecipe(testRecipe);
            showCustomAlert('Success', 'Test public recipe created!', 'success');
            loadPublicRecipes();
        } catch (error) {
            showCustomAlert('Error', 'Failed to create test recipe: ' + error.message, 'error');
        }
    };

    const speakRecipePreview = async (recipe) => {
        try {
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
            showCustomAlert('Error', 'Failed to read recipe preview: ' + error.message, 'error');
        }
    };

    const stopAllSpeech = () => {
        Speech.stop();
        setSpeakingRecipeId(null);
    };

    const handlePinRecipe = async (recipe) => {
        try {
            if (pinnedRecipes.has(recipe.id)) {
                showCustomAlert('Already Pinned', 'This recipe is already pinned to your home screen!', 'info');
                return;
            }

            await FirebaseService.pinRecipe(recipe);
            
            setPinnedRecipes(prev => new Set(prev).add(recipe.id));
            
            showCustomAlert('Success', 'Recipe pinned to your home screen!', 'success');
        } catch (error) {
            console.error('Pin error:', error);
            
            if (error.message && error.message.includes('already pinned')) {
                showCustomAlert('Already Pinned', 'This recipe is already pinned to your home screen!', 'info');
                setPinnedRecipes(prev => new Set(prev).add(recipe.id));
            } else {
                showCustomAlert('Error', 'Failed to pin recipe: ' + (error.message || 'Unknown error'), 'error');
            }
        }
    };

    const filteredRecipes = recipes.filter(recipe =>
        recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (recipe.description && recipe.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (recipe.tags && recipe.tags.some(tag => 
            tag.toLowerCase().includes(searchQuery.toLowerCase())
        )) ||
        (recipe.userName && recipe.userName.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const renderRecipeItem = ({ item }) => (
        <TouchableOpacity 
            style={[
                styles.recipeCard,
                speakingRecipeId === item.id && styles.speakingCard,
                pinnedRecipes.has(item.id) && styles.pinnedCard
            ]}
            onPress={() => navigation.navigate('RecipeDetails', { recipe: item })}
            onLongPress={() => speakRecipePreview(item)}
            delayLongPress={300}
        >
            <View style={styles.recipeHeader}>
                <View style={styles.titleContainer}>
                    <Text style={styles.recipeTitle}>{item.title}</Text>
                    <View style={styles.recipeActions}>
                        <TouchableOpacity 
                            style={[
                                styles.pinButton,
                                pinnedRecipes.has(item.id) && styles.pinButtonActive
                            ]}
                            onPress={() => handlePinRecipe(item)}
                        >
                            <Text style={styles.pinButtonText}>
                                {pinnedRecipes.has(item.id) ? '📌' : '📍'}
                            </Text>
                        </TouchableOpacity>
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
                </View>
                <Text style={styles.recipeAuthor}>by {item.userName || 'Anonymous'}</Text>
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
                {pinnedRecipes.has(item.id) && (
                    <View style={styles.pinnedBadge}>
                        <Text style={styles.pinnedBadgeText}>Pinned</Text>
                    </View>
                )}
                {item.isShared && (
                    <View style={styles.sharedBadge}>
                        <Text style={styles.sharedBadgeText}>Public</Text>
                    </View>
                )}
            </View>
            
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
                <Text style={styles.headerTitle}>🌍Community Recipes</Text>
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

            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search community recipes..."
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

            <View style={styles.voiceInstructions}>
                <Text style={styles.voiceInstructionsText}>
                    🔊 Tap speaker icon or press and hold any recipe to hear a preview
                </Text>
                <Text style={styles.pinInstructionsText}>
                    📍 Tap pin icon to save recipe to your home screen
                </Text>
            </View>

            <View style={styles.content}>
                {loading ? (
                    <View style={styles.centerContent}>
                        <ActivityIndicator size="large" color="#FF6B35" />
                        <Text style={styles.loadingText}>Loading community recipes...</Text>
                    </View>
                ) : filteredRecipes.length === 0 ? (
                    <View style={styles.centerContent}>
                        <Text style={styles.emptyIcon}>🍳</Text>
                        <Text style={styles.emptyStateText}>
                            {searchQuery ? 'No recipes found' : 'No public recipes yet!'}
                        </Text>
                        <Text style={styles.emptyStateSubtext}>
                            {searchQuery ? 'Try a different search term' : 'Be the first to share a recipe with the community'}
                        </Text>
                        <View style={{ gap: 12, marginTop: 20 }}>
                            <TouchableOpacity 
                                style={styles.addRecipeButton}
                                onPress={() => navigation.navigate('AddRecipe')}
                            >
                                <Text style={styles.addRecipeButtonText}>+ Create Recipe</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.addRecipeButton, { backgroundColor: '#28a745' }]}
                                onPress={createTestPublicRecipe}
                            >
                                <Text style={styles.addRecipeButtonText}>🧪 Create Test Public Recipe</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <FlatList
                        data={filteredRecipes}
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

            <CustomAlert
                visible={showAlert}
                title={alertTitle}
                message={alertMessage}
                type={alertType}
                buttons={alertButtons}
                onClose={() => setShowAlert(false)}
            />
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
        marginBottom: 4,
    },
    pinInstructionsText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '500',
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
    pinnedCard: {
        borderLeftColor: '#FFD700',
        backgroundColor: '#FFFDF0',
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
    recipeActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    pinButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F0F0F0',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    pinButtonActive: {
        backgroundColor: '#FFD700',
    },
    pinButtonText: {
        fontSize: 14,
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