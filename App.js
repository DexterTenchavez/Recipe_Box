import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider } from './AuthContext';
import SplashScreen from './SplashScreen';
import LoginScreen from './LoginScreen';
import RegisterScreen from './RegisterScreen';
import HomeScreen from './HomeScreen';
import AddRecipeScreen from './AddRecipeScreen';
import RecipeDetailsScreen from './RecipeDetailsScreen';
import PublicRecipesScreen from './PublicRecipesScreen';

const Stack = createNativeStackNavigator();

// Error Boundary to catch the real error
class ErrorBoundary extends React.Component {
    state = { hasError: false, error: null, errorInfo: null };
    
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    
    componentDidCatch(error, errorInfo) {
        this.setState({ errorInfo });
        console.log('=== REAL ERROR CAUGHT ===');
        console.log('Error:', error);
        console.log('Error Info:', errorInfo);
        console.log('=== END ERROR ===');
    }
    
    render() {
        if (this.state.hasError) {
            return (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorTitle}>🚨 App Crashed</Text>
                    <Text style={styles.errorText}>
                        {this.state.error?.toString()}
                    </Text>
                    <Text style={styles.instruction}>
                        Check your terminal for the full error details
                    </Text>
                    <Text style={styles.stack}>
                        {this.state.errorInfo?.componentStack}
                    </Text>
                </View>
            );
        }
        return this.props.children;
    }
}

const styles = StyleSheet.create({
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff',
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'red',
        marginBottom: 10,
    },
    errorText: {
        fontSize: 14,
        color: '#333',
        textAlign: 'center',
        marginBottom: 20,
    },
    instruction: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
        marginBottom: 10,
    },
    stack: {
        fontSize: 10,
        color: '#999',
        textAlign: 'center',
    },
});

export default function App() {
    return (
        <ErrorBoundary>
            <AuthProvider>
                <NavigationContainer>
                    <Stack.Navigator 
                        screenOptions={{ 
                            headerShown: false,
                            animation: 'slide_from_right',
                            contentStyle: {
                                backgroundColor: '#FFF8F5'
                            }
                        }}
                    >
                        <Stack.Screen name="Splash" component={SplashScreen} />
                        <Stack.Screen name="Login" component={LoginScreen} />
                        <Stack.Screen name="Register" component={RegisterScreen} />
                        <Stack.Screen name="Home" component={HomeScreen} />
                        <Stack.Screen name="PublicRecipes" component={PublicRecipesScreen} />
                        <Stack.Screen name="AddRecipe" component={AddRecipeScreen} />
                        <Stack.Screen 
                            name="RecipeDetails" 
                            component={RecipeDetailsScreen}
                            options={{
                                headerShown: true,
                                headerTitle: 'Recipe Details',
                                headerStyle: {
                                    backgroundColor: '#FF6B35',
                                },
                                headerTintColor: '#fff',
                                headerTitleStyle: {
                                    fontWeight: 'bold',
                                },
                            }}
                        />
                    </Stack.Navigator>
                </NavigationContainer>
            </AuthProvider>
        </ErrorBoundary>
    );
}