import React, { useState } from 'react';
import { View, TextInput, Button, Alert, StyleSheet, KeyboardAvoidingView, Text } from 'react-native';
import { FirebaseService } from './FirebaseService';

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password) return Alert.alert('All fields are required');
    setLoading(true);
    try {
      const user = await FirebaseService.registerUser(name, email, password);
      Alert.alert('Registration successful', `Welcome, ${user.name}`);
      navigation.replace('Login');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container}>
      <Text style={styles.title}>Register</Text>
      <TextInput style={styles.input} placeholder="Name" value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
      <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
      <Button title={loading ? 'Please wait…' : 'Sign Up'} onPress={handleRegister} disabled={loading} />
      <Text style={styles.link} onPress={() => navigation.navigate('Login')}>
        Already have an account? Login
      </Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, textAlign: 'center', marginBottom: 20 },
  input: { borderWidth: 1, marginBottom: 12, padding: 8, borderRadius: 5 },
  link: { marginTop: 16, color: 'blue', textAlign: 'center' },
});