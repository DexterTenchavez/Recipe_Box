import React, { useState, useEffect } from 'react';
import { View, TextInput, Button, Alert, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { FirebaseService } from './FirebaseService';
import { useGoogleSignIn } from './useGoogleSignIn';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { promptAsync, userToken } = useGoogleSignIn();

  useEffect(() => {
    if (userToken) {
      Alert.alert('Welcome!', `Logged in as ${userToken.name || userToken.email}`);
      navigation.replace('Home');
    }
  }, [userToken]);

  const handleLogin = async () => {
    if (!email || !password) return Alert.alert('Enter email and password');
    setLoading(true);
    try {
      const user = await FirebaseService.loginUser(email, password);
      Alert.alert('Welcome!', `Logged in as ${user.name}`);
      navigation.replace('Home');
    } catch (err) {
      Alert.alert('Login failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button title={loading ? 'Logging in…' : 'Login'} onPress={handleLogin} disabled={loading} />

      <TouchableOpacity style={styles.googleButton} onPress={() => promptAsync()}>
        <Text style={styles.googleButtonText}>Sign in with Google</Text>
      </TouchableOpacity>

      <Text style={styles.link} onPress={() => navigation.navigate('Register')}>
        No account? Register
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, textAlign: 'center', marginBottom: 20 },
  input: { borderWidth: 1, marginBottom: 12, padding: 8, borderRadius: 5 },
  link: { marginTop: 16, color: 'blue', textAlign: 'center' },
  googleButton: { backgroundColor: '#4285F4', padding: 12, borderRadius: 5, marginTop: 12 },
  googleButtonText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },
});