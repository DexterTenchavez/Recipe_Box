// UserShareScreen.js
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    Alert,
    ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FirebaseService } from './FirebaseService';

export default function UserShareScreen({ route, navigation }) {
    const { recipe } = route.params;
    const [searchQuery, setSearchQuery] = useState('');
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (searchQuery.length >= 2) {
            searchUsers();
        } else {
            setUsers([]);
        }
    }, [searchQuery]);

    const searchUsers = async () => {
        setSearching(true);
        try {
            const foundUsers = await FirebaseService.searchUsers(searchQuery);
            setUsers(foundUsers);
        } catch (error) {
            Alert.alert('Error', 'Failed to search users: ' + error.message);
        } finally {
            setSearching(false);
        }
    };

    const handleShare = async (user) => {
        setLoading(true);
        try {
            await FirebaseService.shareRecipeWithUser(recipe.id, user.uid, message);
            Alert.alert(
                'Success', 
                `Recipe shared with ${user.name} successfully!`,
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        } catch (error) {
            Alert.alert('Error', 'Failed to share recipe: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const renderUserItem = ({ item }) => (
        <TouchableOpacity 
            style={styles.userItem}
            onPress={() => handleShare(item)}
            disabled={loading}
        >
            <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.name}</Text>
                <Text style={styles.userEmail}>{item.email}</Text>
            </View>
            <TouchableOpacity 
                style={[styles.shareButton, loading && styles.disabledButton]}
                onPress={() => handleShare(item)}
                disabled={loading}
            >
                <Text style={styles.shareButtonText}>
                    {loading ? 'Sharing...' : 'Share'}
                </Text>
            </TouchableOpacity>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity 
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Share Recipe</Text>
                <View style={styles.headerPlaceholder} />
            </View>

            <View style={styles.content}>
                <Text style={styles.recipeTitle}>"{recipe.title}"</Text>
                
                <View style={styles.searchSection}>
                    <Text style={styles.label}>Search Users</Text>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Type user name to search..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholderTextColor="#999"
                    />
                </View>

                <View style={styles.messageSection}>
                    <Text style={styles.label}>Personal Message (Optional)</Text>
                    <TextInput
                        style={[styles.searchInput, styles.messageInput]}
                        placeholder="Add a personal message..."
                        value={message}
                        onChangeText={setMessage}
                        placeholderTextColor="#999"
                        multiline
                        numberOfLines={3}
                    />
                </View>

                {searching && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color="#FF6B35" />
                        <Text style={styles.loadingText}>Searching users...</Text>
                    </View>
                )}

                {users.length > 0 && (
                    <View style={styles.resultsSection}>
                        <Text style={styles.resultsTitle}>Found Users:</Text>
                        <FlatList
                            data={users}
                            renderItem={renderUserItem}
                            keyExtractor={(item) => item.uid}
                            style={styles.usersList}
                            showsVerticalScrollIndicator={false}
                        />
                    </View>
                )}

                {searchQuery.length >= 2 && users.length === 0 && !searching && (
                    <View style={styles.noResults}>
                        <Text style={styles.noResultsText}>No users found</Text>
                        <Text style={styles.noResultsSubtext}>
                            Try searching with a different name
                        </Text>
                    </View>
                )}

                {searchQuery.length < 2 && (
                    <View style={styles.instructions}>
                        <Text style={styles.instructionsText}>
                            Type at least 2 characters to search for users
                        </Text>
                    </View>
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
    headerPlaceholder: {
        width: 60,
    },
    content: {
        flex: 1,
        padding: 20,
    },
    recipeTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FF6B35',
        textAlign: 'center',
        marginBottom: 24,
        fontStyle: 'italic',
    },
    searchSection: {
        marginBottom: 20,
    },
    messageSection: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2D2D2D',
        marginBottom: 8,
    },
    searchInput: {
        backgroundColor: '#FFFFFF',
        borderWidth: 2,
        borderColor: '#FFE5D9',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#2D2D2D',
    },
    messageInput: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
        color: '#666666',
    },
    resultsSection: {
        flex: 1,
    },
    resultsTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2D2D2D',
        marginBottom: 12,
    },
    usersList: {
        flex: 1,
    },
    userItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 16,
        marginBottom: 12,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2D2D2D',
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 14,
        color: '#666666',
    },
    shareButton: {
        backgroundColor: '#FF6B35',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    disabledButton: {
        backgroundColor: '#FFA375',
        opacity: 0.7,
    },
    shareButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
    },
    noResults: {
        alignItems: 'center',
        padding: 40,
    },
    noResultsText: {
        fontSize: 16,
        color: '#666666',
        marginBottom: 8,
    },
    noResultsSubtext: {
        fontSize: 14,
        color: '#999999',
        textAlign: 'center',
    },
    instructions: {
        alignItems: 'center',
        padding: 40,
    },
    instructionsText: {
        fontSize: 14,
        color: '#666666',
        textAlign: 'center',
    },
});