import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Mail, Home, MapPin, User, Lock, CreditCard, Smartphone, Banknote, Check } from 'lucide-react-native';
import { authAPI, storage } from '../../utils/auth';
import CustomAlert from '../components/CustomAlert';
import { Button, TextField, Card } from '../components/ui';
import { colors, radius, spacing, typography } from '@/theme';

type Step = 'account' | 'address' | 'payment';
const STEPS: Step[] = ['account', 'address', 'payment'];

type PaymentPreference = 'card' | 'wallet' | 'cash';

const PAYMENT_OPTIONS: { id: PaymentPreference; label: string; icon: typeof CreditCard }[] = [
  { id: 'card', label: 'Debit / credit card', icon: CreditCard },
  { id: 'wallet', label: 'Mobile wallet (JazzCash / EasyPaisa)', icon: Smartphone },
  { id: 'cash', label: 'Cash on delivery', icon: Banknote },
];

export default function SignupScreen() {
  const [step, setStep] = useState<Step>('account');
  const [formData, setFormData] = useState({
    userType: 'customer' as const,
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    houseNumber: '',
    portion: 'upper' as 'upper' | 'lower',
    address: '',
  });
  const [paymentPreference, setPaymentPreference] = useState<PaymentPreference>('cash');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const [showAlert, setShowAlert] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  const showError = (message: string) => {
    setAlertTitle('Error');
    setAlertMessage(message);
    setShowAlert(true);
  };

  const updateFormData = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const goToAddressStep = () => {
    if (!formData.name.trim() || !formData.email.trim() || !formData.password.trim() || !formData.confirmPassword.trim()) {
      showError('Please fill in all required fields');
      return;
    }
    if (!formData.fullName.trim()) {
      showError('Please fill in all fields');
      return;
    }
    if (!formData.email.includes('@')) {
      showError('Please enter a valid email address');
      return;
    }
    if (formData.password.length < 6) {
      showError('Password must be at least 6 characters');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      showError('Passwords do not match');
      return;
    }
    setStep('address');
  };

  const goToPaymentStep = () => {
    if (!formData.houseNumber.trim() || !formData.address.trim()) {
      showError('Please fill in all fields');
      return;
    }
    setStep('payment');
  };

  const handleSignup = async () => {
    setIsLoading(true);

    try {
      const requestData = {
        userType: formData.userType,
        name: formData.name.trim(),
        email: formData.email.toLowerCase().trim(),
        password: formData.password,
        fullName: formData.fullName.trim(),
        houseNumber: formData.houseNumber.trim(),
        portion: formData.portion,
        address: formData.address.trim(),
      };

      const response = await authAPI.register(requestData);

      if (response.success) {
        await storage.savePaymentPreference(paymentPreference);

        setAlertTitle('Success');
        setAlertMessage('Account created successfully! Please sign in.');
        setShowAlert(true);

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
        setStep('account');

        setTimeout(() => {
          router.replace('/auth/login');
        }, 2000);
      } else {
        showError(response.message || 'Failed to create account');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred while creating account';
      showError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 'account') {
      router.back();
    } else if (step === 'address') {
      setStep('account');
    } else {
      setStep('address');
    }
  };

  const stepIndex = STEPS.indexOf(step);

  return (
    <LinearGradient colors={[colors.primary[500], colors.primary[700]]} style={styles.background}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <ArrowLeft size={24} color={colors.neutral[0]} />
            </TouchableOpacity>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join AabRahat today</Text>
          </View>

          <View style={styles.progressRow}>
            {STEPS.map((s, i) => (
              <View key={s} style={[styles.progressSegment, i <= stepIndex && styles.progressSegmentActive]} />
            ))}
          </View>

          <View style={styles.form}>
            {step === 'account' && (
              <>
                <TextField
                  icon={User}
                  label="Display Name"
                  labelColor="rgba(255, 255, 255, 0.85)"
                  placeholder="What should we call you?"
                  value={formData.name}
                  onChangeText={(value) => updateFormData('name', value)}
                  autoCapitalize="words"
                />

                <TextField
                  icon={User}
                  label="Full Name"
                  labelColor="rgba(255, 255, 255, 0.85)"
                  placeholder="As it should appear on deliveries"
                  value={formData.fullName}
                  onChangeText={(value) => updateFormData('fullName', value)}
                  autoCapitalize="words"
                />

                <TextField
                  icon={Mail}
                  label="Email Address"
                  labelColor="rgba(255, 255, 255, 0.85)"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChangeText={(value) => updateFormData('email', value)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <TextField
                  icon={Lock}
                  label="Password"
                  labelColor="rgba(255, 255, 255, 0.85)"
                  placeholder="At least 6 characters"
                  value={formData.password}
                  onChangeText={(value) => updateFormData('password', value)}
                  secureToggle
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <TextField
                  icon={Lock}
                  label="Confirm Password"
                  labelColor="rgba(255, 255, 255, 0.85)"
                  placeholder="Re-enter your password"
                  value={formData.confirmPassword}
                  onChangeText={(value) => updateFormData('confirmPassword', value)}
                  secureToggle
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <Button label="Continue" onPress={goToAddressStep} variant="secondary" size="lg" style={styles.signupButton} />
              </>
            )}

            {step === 'address' && (
              <>
                <TextField
                  icon={Home}
                  label="House Number"
                  labelColor="rgba(255, 255, 255, 0.85)"
                  value={formData.houseNumber}
                  onChangeText={(value) => updateFormData('houseNumber', value)}
                />

                <View style={styles.portionContainer}>
                  <Text style={styles.portionLabel}>Portion Type</Text>
                  <View style={styles.portionButtons}>
                    <TouchableOpacity
                      style={[styles.portionButton, formData.portion === 'upper' && styles.portionButtonActive]}
                      onPress={() => updateFormData('portion', 'upper')}
                    >
                      <Text style={[styles.portionButtonText, formData.portion === 'upper' && styles.portionButtonTextActive]}>
                        Upper Portion
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.portionButton, formData.portion === 'lower' && styles.portionButtonActive]}
                      onPress={() => updateFormData('portion', 'lower')}
                    >
                      <Text style={[styles.portionButtonText, formData.portion === 'lower' && styles.portionButtonTextActive]}>
                        Lower Portion
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <TextField
                  icon={MapPin}
                  label="Address"
                  labelColor="rgba(255, 255, 255, 0.85)"
                  value={formData.address}
                  onChangeText={(value) => updateFormData('address', value)}
                  autoCapitalize="words"
                />

                <Button label="Continue" onPress={goToPaymentStep} variant="secondary" size="lg" style={styles.signupButton} />
              </>
            )}

            {step === 'payment' && (
              <>
                <Text style={styles.paymentHint}>
                  This covers tanker orders for your account — you can change it anytime later.
                </Text>
                {PAYMENT_OPTIONS.map((opt) => {
                  const selected = paymentPreference === opt.id;
                  return (
                    <Card
                      key={opt.id}
                      onPress={() => setPaymentPreference(opt.id)}
                      style={[styles.paymentOption, selected && styles.paymentOptionSelected]}
                    >
                      <View style={styles.paymentOptionRow}>
                        <opt.icon size={20} color={selected ? colors.neutral[0] : 'rgba(255,255,255,0.85)'} />
                        <Text style={[styles.paymentOptionText, selected && styles.paymentOptionTextSelected]}>
                          {opt.label}
                        </Text>
                        {selected && <Check size={16} color={colors.neutral[0]} strokeWidth={3} />}
                      </View>
                    </Card>
                  );
                })}

                <Button
                  label={isLoading ? 'Creating Account...' : 'Create Account'}
                  onPress={handleSignup}
                  loading={isLoading}
                  variant="secondary"
                  size="lg"
                  style={styles.signupButton}
                />
              </>
            )}

            <TouchableOpacity style={styles.loginButton} onPress={() => router.push('/auth/login')}>
              <Text style={styles.loginButtonText}>Already have an account? Sign In</Text>
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
    paddingHorizontal: spacing.xxl,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  backButton: {
    position: 'absolute',
    left: spacing.xxl,
    top: 65,
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
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
  progressRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.xxl,
    marginBottom: spacing.xl,
  },
  progressSegment: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  progressSegmentActive: {
    backgroundColor: colors.neutral[0],
  },
  form: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xxxl + spacing.sm,
  },
  portionContainer: {
    marginBottom: spacing.lg,
  },
  portionLabel: {
    fontFamily: typography.label.fontFamily,
    fontSize: 14,
    color: colors.neutral[0],
    marginBottom: spacing.md,
  },
  portionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  portionButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  portionButtonActive: {
    backgroundColor: colors.neutral[0],
  },
  portionButtonText: {
    fontFamily: typography.label.fontFamily,
    fontSize: 14,
    color: colors.neutral[0],
  },
  portionButtonTextActive: {
    color: colors.primary[600],
  },
  paymentHint: {
    fontFamily: typography.body.fontFamily,
    fontSize: 12.5,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 19,
    marginBottom: spacing.lg,
  },
  paymentOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.25)',
    marginBottom: spacing.sm + 2,
  },
  paymentOptionSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderColor: colors.neutral[0],
  },
  paymentOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  paymentOptionText: {
    flex: 1,
    fontFamily: typography.bodyMed.fontFamily,
    fontSize: 13.5,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  paymentOptionTextSelected: {
    color: colors.neutral[0],
  },
  signupButton: {
    backgroundColor: colors.neutral[0],
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  loginButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  loginButtonText: {
    fontFamily: typography.body.fontFamily,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
  },
});
