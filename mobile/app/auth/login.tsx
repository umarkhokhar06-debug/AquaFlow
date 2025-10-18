import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Droplets,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Truck,
} from 'lucide-react-native';
import axios from 'axios';
import { config } from '../../config';
import CustomAlert from '../components/CustomAlert';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userType, setUserType] = useState<'user' | 'driver'>('user');
  const router = useRouter();

  const [showAlert, setShowAlert] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }


    // declare user role  in variable 
    let user = 'user';


    setIsLoading(true);
    try {
      const response = await axios.post(`${config.backendUrl}/auth/login`, {
        email,
        password,
      });
      console.log('Login response:', response.data);

      if (response.status) {
        const { token, id, role,avatar,name, email } = response.data;
        await AsyncStorage.setItem('userData', JSON.stringify({ token, id, role, avatar, name, email }));
        user = role;
        console.log('Login successful:', { token, id, role, avatar, name, email });
      } else {
        setAlertTitle('Error');
        setAlertMessage(response.data.message || 'Login failed. Please try again.');
        setShowAlert(true);
        setIsLoading(false);
        return;
      }
    } catch (error) {
      let message = 'An error occurred while Sign in account';
      if (axios.isAxiosError(error)) {
        message =
          error.response?.data?.error ||
          error.response?.data?.message ||
          error.message;
      }
      setAlertTitle('Error');
      setAlertMessage(message);
      setShowAlert(true);
      setIsLoading(false);
      return;
    }

    // Reset form fields
    setEmail('');
    setPassword('');
    setShowPassword(false);
    // setUserType('user');

    console.log('User type:', user);

    // Navigate based on user type
    if (user === 'driver') {
      router.replace('/(driver)/(tabs)');
    } else {
      router.replace('/(main)/(tabs)');
    }
  };

  const handleForgotPassword = () => {
    router.push('/auth/forgot-password');
  };

  function loginAsCustomer(): void {
    setEmail('user@test.com');
    setPassword('12345678');
    setUserType('user');
    // TODO: Login Using hardcoded credentials for testing
    // router.push('/(main)/(tabs)');
    // handleLogin();
  }

  function loginAsDriver(): void {
    setEmail('driver@test.com');
    setPassword('12345678');
    setUserType('driver');
    // TODO: Login Using hardcoded credentials for testing
    // router.push('/(driver)/(tabs)');
    // handleLogin();
  }

  return (
    <LinearGradient colors={['#007AFF', '#0056CC']} style={styles.background}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Droplets size={40} color="#FFFFFF" />
            </View>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to your account</Text>
          </View>

          <View style={styles.form}>
            {/* User Type Selection For Testing */}
            <View style={styles.userTypeContainer}>
              <Text style={styles.userTypeLabel}>Login as Test User</Text>
              <View style={styles.userTypeButtons}>
                <TouchableOpacity
                  style={[
                    styles.userTypeButton,
                    userType === 'user' && styles.userTypeButtonActive,
                  ]}
                  onPress={() => loginAsCustomer()}
                >
                  <User
                    size={20}
                    color={userType === 'user' ? '#007AFF' : '#FFFFFF'}
                  />
                  <Text
                    style={[
                      styles.userTypeButtonText,
                      userType === 'user' &&
                        styles.userTypeButtonTextActive,
                    ]}
                  >
                    Customer
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.userTypeButton,
                    userType === 'driver' && styles.userTypeButtonActive,
                  ]}
                  onPress={() => loginAsDriver()}
                >
                  <Truck
                    size={20}
                    color={userType === 'driver' ? '#007AFF' : '#FFFFFF'}
                  />
                  <Text
                    style={[
                      styles.userTypeButtonText,
                      userType === 'driver' && styles.userTypeButtonTextActive,
                    ]}
                  >
                    Driver
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* User Type Selection */}
            {/* <View style={styles.userTypeContainer}>
              <Text style={styles.userTypeLabel}>Login as:</Text>
              <View style={styles.userTypeButtons}>
                <TouchableOpacity
                  style={[
                    styles.userTypeButton,
                    userType === 'user' && styles.userTypeButtonActive,
                  ]}
                  onPress={() => setUserType('user')}
                >
                  <User
                    size={20}
                    color={userType === 'user' ? '#007AFF' : '#FFFFFF'}
                  />
                  <Text
                    style={[
                      styles.userTypeButtonText,
                      userType === 'user' &&
                        styles.userTypeButtonTextActive,
                    ]}
                  >
                    Customer
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.userTypeButton,
                    userType === 'driver' && styles.userTypeButtonActive,
                  ]}
                  onPress={() => setUserType('driver')}
                >
                  <Truck
                    size={20}
                    color={userType === 'driver' ? '#007AFF' : '#FFFFFF'}
                  />
                  <Text
                    style={[
                      styles.userTypeButtonText,
                      userType === 'driver' && styles.userTypeButtonTextActive,
                    ]}
                  >
                    Driver
                  </Text>
                </TouchableOpacity>
              </View>
            </View> */}

            <View style={styles.inputContainer}>
              <Mail size={20} color="#666666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email Address"
                placeholderTextColor="#999999"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Lock size={20} color="#666666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#999999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff size={20} color="#666666" />
                ) : (
                  <Eye size={20} color="#666666" />
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.forgotPassword}
              onPress={handleForgotPassword}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.loginButton,
                isLoading && styles.loginButtonDisabled,
              ]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              <Text style={styles.loginButtonText}>
                {isLoading
                  ? 'Signing In...'
                  : `Sign In as ${
                      userType === 'user' ? 'user' : 'Driver'
                    }`}
              </Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.signupButton}
              onPress={() => router.push('/auth/signup')}
            >
              <Text style={styles.signupButtonText}>Create New Account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
      <CustomAlert
        visible={showAlert}
        title={alertTitle}
        message={alertMessage}
        onClose={() => setShowAlert(false)}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  form: {
    width: '100%',
  },
  userTypeContainer: {
    marginBottom: 24,
  },
  userTypeLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  userTypeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  userTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  userTypeButtonActive: {
    backgroundColor: '#FFFFFF',
  },
  userTypeButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  userTypeButtonTextActive: {
    color: '#007AFF',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#333333',
  },
  eyeIcon: {
    padding: 4,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    textDecorationLine: 'underline',
  },
  loginButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#007AFF',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  dividerText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.6)',
    marginHorizontal: 16,
  },
  signupButton: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  signupButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
  },
});
