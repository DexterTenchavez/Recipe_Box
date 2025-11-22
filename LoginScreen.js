import React, { useState } from 'react';
import { 
  View, 
  TextInput, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Image,
  Modal,
  Animated,
  Easing
} from 'react-native';
import { FirebaseService } from './FirebaseService';

const CustomAlert = ({ visible, title, message, type = 'warning', onClose }) => {
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
              <TouchableOpacity 
                style={[alertStyles.alertButton, alertStyles.alertButtonPrimary]}
                onPress={handleClose}
              >
                <Text style={alertStyles.alertButtonText}>OK</Text>
              </TouchableOpacity>
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
  alertButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('warning');

  const showCustomAlert = (title, message, type = 'warning') => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setShowAlert(true);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      showCustomAlert('Error', 'Please enter both email and password', 'error');
      return;
    }
    
    setLoading(true);
    try {
      const user = await FirebaseService.loginUser(email, password);
      showCustomAlert('Welcome!', `Logged in as ${user.name}`, 'success');
      setTimeout(() => {
        navigation.replace('Home');
      }, 1500);
    } catch (err) {
      showCustomAlert('Login Failed', err.message, 'error');
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
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.infoButton}
              onPress={() => setShowAboutModal(true)}
            >
              <Text style={styles.infoButtonText}>ℹ️</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.logoSection}>
            <View style={styles.logoContainer}>
              <Image source={require('./assets/recipe.png')} style={styles.logo} />
            </View>
            <Text style={styles.title}>Sign in</Text>
            <Text style={styles.subtitle}>Sign in to your Recipe Box account</Text>
          </View>

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

      <CustomAlert
        visible={showAlert}
        title={alertTitle}
        message={alertMessage}
        type={alertType}
        onClose={() => setShowAlert(false)}
      />
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