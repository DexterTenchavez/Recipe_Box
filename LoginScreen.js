import React, { useState } from 'react';
import { 
  View, 
  TextInput, 
  Alert, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Image,
  Modal
} from 'react-native';
import { FirebaseService } from './FirebaseService';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }
    
    setLoading(true);
    try {
      const user = await FirebaseService.loginUser(email, password);
      Alert.alert('Welcome!', `Logged in as ${user.name}`);
      navigation.replace('Home');
    } catch (err) {
      Alert.alert('Login Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Header with Info Button */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.infoButton}
              onPress={() => setShowAboutModal(true)}
            >
              <Text style={styles.infoButtonText}>ℹ️</Text>
            </TouchableOpacity>
          </View>

          {/* Logo and Title */}
          <View style={styles.logoSection}>
            <View style={styles.logoContainer}>
              {/* Replace with your actual logo */}
              <Image source={require('./assets/recipe.png')} style={styles.logo} />
              {/* If you have your icon-logo.png: */}
              {/* <Image source={require('./assets/icon-logo.png')} style={styles.logo} /> */}
            </View>
            <Text style={styles.title}>Sign in</Text>
            <Text style={styles.subtitle}>Sign in to your Recipe Box account</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter your password"
                  placeholderTextColor="#999"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  editable={!loading}
                />
                <TouchableOpacity 
                  style={styles.eyeButton}
                  onPress={toggleShowPassword}
                  disabled={loading}
                >
                  <Text style={styles.eyeIcon}>
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.loginButton, loading && styles.disabledButton]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Don't have an account?{' '}
              <Text 
                style={styles.link} 
                onPress={() => !loading && navigation.navigate('Register')}
              >
                Create Account
              </Text>
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* About Info Modal */}
      <Modal
        visible={showAboutModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAboutModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>About Recipe Book App</Text>
              
              <View style={styles.aboutSection}>
                <Text style={styles.aboutSectionTitle}>👥 Submitted By:</Text>
                <View style={styles.membersList}>
                  <Text style={styles.memberItem}>• Dexter Tenchavez (Leader)</Text>
                  <Text style={styles.memberItem}>• Novy Mapute</Text>
                  <Text style={styles.memberItem}>• Ricianin L. Bontog</Text>
                  <Text style={styles.memberItem}>• Mark Hundson Montero</Text>
                  <Text style={styles.memberItem}>• Junalee Serbon</Text>
                  <Text style={styles.memberItem}>• Nino B. Labos</Text>
                  <Text style={styles.memberItem}>• Alexandra Lloymie A. Regala</Text>
                  <Text style={styles.memberItem}>• Kembirly Autida</Text>
                  <Text style={styles.memberItem}>• Ma. Verna Wayway</Text>
                  <Text style={styles.memberItem}>• Mary Grace Ramos</Text>
                </View>
              </View>

              <View style={styles.aboutSection}>
                <Text style={styles.aboutSectionTitle}>📝 Submitted To:</Text>
                <Text style={styles.instructorText}>Jay Ian Camelotes</Text>
              </View>

              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowAboutModal(false)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F5',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 24,
    zIndex: 10,
  },
  infoButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
   
    justifyContent: 'center',
    alignItems: 'center',
   
   
  },
  infoButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2D2D2D',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D2D2D',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#FFE5D9',
    borderRadius: 16,
    padding: 18,
    fontSize: 16,
    color: '#2D2D2D',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#FFE5D9',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  passwordInput: {
    flex: 1,
    padding: 18,
    fontSize: 16,
    color: '#2D2D2D',
  },
  eyeButton: {
    padding: 16,
  },
  eyeIcon: {
    fontSize: 20,
  },
  loginButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginTop: 8,
  },
  disabledButton: {
    backgroundColor: '#FFA375',
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#FFE5D9',
  },
  footerText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  link: {
    color: '#FF6B35',
    fontWeight: '700',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D2D2D',
    marginBottom: 20,
    textAlign: 'center',
  },
  aboutSection: {
    marginBottom: 24,
  },
  aboutSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D2D2D',
    marginBottom: 12,
  },
  membersList: {
    marginLeft: 8,
  },
  memberItem: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 6,
    lineHeight: 20,
  },
  instructorText: {
    fontSize: 16,
    color: '#FF6B35',
    fontWeight: '600',
    marginLeft: 8,
  },
  closeButton: {
    backgroundColor: '#FF6B35',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});