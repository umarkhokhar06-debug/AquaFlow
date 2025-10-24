import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Mail,
  Home,
  MapPin,
  User,
  Lock,
  Eye,
  EyeOff,
  Truck,
} from 'lucide-react-native';
import { authAPI } from '../../utils/auth';
import CustomAlert from '../components/CustomAlert';

export default function SignupScreen() {
  const [formData, setFormData] = useState({
    userType: 'customer' as 'customer' | 'driver',
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    houseNumber: '',
    portion: 'upper' as 'upper' | 'lower',
    address: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const [showAlert, setShowAlert] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  const handleSignup = async () => {
    // Basic validation
    if (
      !formData.name.trim() ||
      !formData.email.trim() ||
      !formData.password.trim() ||
      !formData.confirmPassword.trim()
    ) {
      setAlertTitle('Error');
      setAlertMessage('Please fill in all required fields');
      setShowAlert(true);
      return;
    }

    // Customer-specific validation
    if (formData.userType === 'customer') {
      if (
        !formData.fullName.trim() ||
        !formData.houseNumber.trim() ||
        !formData.address.trim()
      ) {
        setAlertTitle('Error');
        setAlertMessage('Please fill in all customer fields');
        setShowAlert(true);
        return;
      }
    }

    if (!formData.email.includes('@')) {
      setAlertTitle('Error');
      setAlertMessage('Please enter a valid email address');
      setShowAlert(true);
      return;
    }

    if (formData.password.length < 6) {
      setAlertTitle('Error');
      setAlertMessage('Password must be at least 6 characters');
      setShowAlert(true);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setAlertTitle('Error');
      setAlertMessage('Passwords do not match');
      setShowAlert(true);
      return;
    }

    setIsLoading(true);

    try {
      // Prepare request data based on user type
      const requestData = {
        userType: formData.userType,
        name: formData.name.trim(),
        email: formData.email.toLowerCase().trim(),
        password: formData.password,
        ...(formData.userType === 'customer' && {
          fullName: formData.fullName.trim(),
          houseNumber: formData.houseNumber.trim(),
          portion: formData.portion,
          address: formData.address.trim(),
        }),
      };

      const response = await authAPI.register(requestData);

      if (response.success) {
        setAlertTitle('Success');
        setAlertMessage('Account created successfully! Please sign in.');
        setShowAlert(true);
        
        // Reset form data
        setFormData({
          userType: 'customer',
          name: '',
          email: '',
          password: '',
          confirmPassword: '',
          fullName: '',
          houseNumber: '',
          portion: 'upper',
          address: '',
        });
        setShowPassword(false);
        setShowConfirmPassword(false);
        
        // Navigate to login after a short delay
        setTimeout(() => {
          router.replace('/auth/login');
        }, 2000);
      } else {
        setAlertTitle('Error');
        setAlertMessage(response.message || 'Failed to create account');
        setShowAlert(true);
      }
    } catch (error) {
      let message = 'An error occurred while creating account';
      if (error instanceof Error) {
        message = error.message;
      }
      setAlertTitle('Error');
      setAlertMessage(message);
      setShowAlert(true);
    } finally {
      setIsLoading(false);
    }

    // TODO: Reset form data after successful signup
    // setFormData({
    //   fullName: '',
    //   email: '',
    //   password: '',
    //   confirmPassword: '',
    //   houseNumber: '',
    //   portion: 'upper',
    //   area: '',
    // });
    // setShowPassword(false);
    // setShowConfirmPassword(false);
    // setIsLoading(false);
  };

  const updateFormData = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <LinearGradient colors={['#007AFF', '#0056CC']} style={styles.background}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <ArrowLeft size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join AquaDispatch today</Text>
          </View>

          <View style={styles.form}>
            {/* User Type Selection */}
            <View style={styles.userTypeContainer}>
              <Text style={styles.userTypeLabel}>Account Type</Text>
              <View style={styles.userTypeButtons}>
                <TouchableOpacity
                  style={[
                    styles.userTypeButton,
                    formData.userType === 'customer' && styles.userTypeButtonActive,
                  ]}
                  onPress={() => updateFormData('userType', 'customer')}
                >
                  <User
                    size={20}
                    color={formData.userType === 'customer' ? '#007AFF' : '#FFFFFF'}
                  />
                  <Text
                    style={[
                      styles.userTypeButtonText,
                      formData.userType === 'customer' && styles.userTypeButtonTextActive,
                    ]}
                  >
                    Customer
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.userTypeButton,
                    formData.userType === 'driver' && styles.userTypeButtonActive,
                  ]}
                  onPress={() => updateFormData('userType', 'driver')}
                >
                  <Truck
                    size={20}
                    color={formData.userType === 'driver' ? '#007AFF' : '#FFFFFF'}
                  />
                  <Text
                    style={[
                      styles.userTypeButtonText,
                      formData.userType === 'driver' && styles.userTypeButtonTextActive,
                    ]}
                  >
                    Driver
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <User size={20} color="#666666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Name"
                placeholderTextColor="#999999"
                value={formData.name}
                onChangeText={(value) => updateFormData('name', value)}
                autoCapitalize="words"
              />
            </View>

            {formData.userType === 'customer' && (
              <View style={styles.inputContainer}>
                <User size={20} color="#666666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  placeholderTextColor="#999999"
                  value={formData.fullName}
                  onChangeText={(value) => updateFormData('fullName', value)}
                  autoCapitalize="words"
                />
              </View>
            )}

            <View style={styles.inputContainer}>
              <Mail size={20} color="#666666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email Address"
                placeholderTextColor="#999999"
                value={formData.email}
                onChangeText={(value) => updateFormData('email', value)}
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
                value={formData.password}
                onChangeText={(value) => updateFormData('password', value)}
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

            <View style={styles.inputContainer}>
              <Lock size={20} color="#666666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                placeholderTextColor="#999999"
                value={formData.confirmPassword}
                onChangeText={(value) =>
                  updateFormData('confirmPassword', value)
                }
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff size={20} color="#666666" />
                ) : (
                  <Eye size={20} color="#666666" />
                )}
              </TouchableOpacity>
            </View>

            {formData.userType === 'customer' && (
              <>
                <View style={styles.inputContainer}>
                  <Home size={20} color="#666666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="House Number"
                    placeholderTextColor="#999999"
                    value={formData.houseNumber}
                    onChangeText={(value) => updateFormData('houseNumber', value)}
                  />
                </View>

                <View style={styles.portionContainer}>
                  <Text style={styles.portionLabel}>Portion Type</Text>
                  <View style={styles.portionButtons}>
                    <TouchableOpacity
                      style={[
                        styles.portionButton,
                        formData.portion === 'upper' && styles.portionButtonActive,
                      ]}
                      onPress={() => updateFormData('portion', 'upper')}
                    >
                      <Text
                        style={[
                          styles.portionButtonText,
                          formData.portion === 'upper' &&
                            styles.portionButtonTextActive,
                        ]}
                      >
                        Upper Portion
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.portionButton,
                        formData.portion === 'lower' && styles.portionButtonActive,
                      ]}
                      onPress={() => updateFormData('portion', 'lower')}
                    >
                      <Text
                        style={[
                          styles.portionButtonText,
                          formData.portion === 'lower' &&
                            styles.portionButtonTextActive,
                        ]}
                      >
                        Lower Portion
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <MapPin size={20} color="#666666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Address"
                    placeholderTextColor="#999999"
                    value={formData.address}
                    onChangeText={(value) => updateFormData('address', value)}
                    autoCapitalize="words"
                  />
                </View>
              </>
            )}

            <TouchableOpacity
              style={[
                styles.signupButton,
                isLoading && styles.signupButtonDisabled,
              ]}
              onPress={handleSignup}
              disabled={isLoading}
            >
              <Text style={styles.signupButtonText}>
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => router.push('/auth/login')}
            >
              <Text style={styles.loginButtonText}>
                Already have an account? Sign In
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 40,
  },
  backButton: {
    position: 'absolute',
    left: 24,
    top: 65,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
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
    paddingHorizontal: 24,
    paddingBottom: 40,
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
  portionContainer: {
    marginBottom: 16,
  },
  portionLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  portionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  portionButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  portionButtonActive: {
    backgroundColor: '#FFFFFF',
  },
  portionButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
  },
  portionButtonTextActive: {
    color: '#007AFF',
  },
  signupButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  signupButtonDisabled: {
    opacity: 0.7,
  },
  signupButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#007AFF',
  },
  loginButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  loginButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
  },
});
