import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Droplets, Mail, Lock } from 'lucide-react-native';
import { authAPI, storage } from '../../utils/auth';
import CustomAlert from '../components/CustomAlert';
import { Button, TextField } from '../components/ui';
import { colors, radius, spacing, typography } from '@/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const [showAlert, setShowAlert] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  const showError = (title: string, message: string) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setShowAlert(true);
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      showError('Missing information', 'Please enter both email and password');
      return;
    }

    if (!email.includes('@')) {
      showError('Invalid email', 'Please enter a valid email address');
      return;
    }

    if (password.length < 6) {
      showError('Invalid password', 'Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authAPI.login({
        email: email.toLowerCase().trim(),
        password,
      });

      if (response.success && response.token && response.user) {
        await storage.saveUserData(response.token, response.user);

        setEmail('');
        setPassword('');
        setIsLoading(false);

        if (response.user.userType === 'driver') {
          router.replace('/(driver)/(tabs)');
        } else {
          router.replace('/(main)/(tabs)');
        }
      } else {
        showError('Sign in failed', response.message || 'Please check your details and try again.');
        setIsLoading(false);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred while signing in';
      showError('Sign in failed', message);
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    router.push('/auth/forgot-password');
  };

  return (
    <LinearGradient colors={[colors.primary[500], colors.primary[700]]} style={styles.background}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Droplets size={40} color={colors.neutral[0]} />
            </View>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to your account</Text>
          </View>

          <View style={styles.form}>
            <TextField
              icon={Mail}
              placeholder="Email Address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextField
              icon={Lock}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureToggle
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity style={styles.forgotPassword} onPress={handleForgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            <Button
              label={isLoading ? 'Signing In...' : 'Sign In'}
              onPress={handleLogin}
              loading={isLoading}
              variant="secondary"
              size="lg"
              style={styles.loginButton}
            />

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <Button
              label="Create New Account"
              variant="outline"
              onDark
              size="lg"
              onPress={() => router.push('/auth/signup')}
              style={styles.signupButton}
            />
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
    paddingHorizontal: spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxxl + spacing.sm,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  title: {
    fontFamily: typography.h1.fontFamily,
    fontSize: typography.h1.fontSize,
    color: colors.neutral[0],
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: typography.body.fontFamily,
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  form: {
    width: '100%',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: spacing.xxl,
    marginTop: -spacing.sm,
  },
  forgotPasswordText: {
    fontFamily: typography.body.fontFamily,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    textDecorationLine: 'underline',
  },
  loginButton: {
    backgroundColor: colors.neutral[0],
    marginBottom: spacing.xxl,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  dividerText: {
    fontFamily: typography.body.fontFamily,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginHorizontal: spacing.lg,
  },
  signupButton: {
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
});
