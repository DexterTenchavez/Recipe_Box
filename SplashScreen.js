// SplashScreen.js
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function SplashScreen({ navigation }) {
    useEffect(() => {
        // Navigate to Login after 2-3 seconds
        const timer = setTimeout(() => {
            navigation.replace('Login');
        }, 2500);
        return () => clearTimeout(timer);
    }, [navigation]);

    return (
        <LinearGradient
            colors={['#FF7F50', '#FFB347']} // gradient colors like your mockup
            style={styles.container}
        >
            <Text style={styles.title}>🍽Recipe Box</Text>
            <Text style={styles.subtitle}>Your culinary companion</Text>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
    },
    subtitle: {
        fontSize: 16,
        color: '#fff',
        marginTop: 5,
    },
});