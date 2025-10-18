import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  ArrowLeft, 
  Plus, 
  CreditCard, 
  Smartphone, 
  Banknote, 
  Edit3, 
  Trash2, 
  Star,
  Shield,
  CheckCircle
} from 'lucide-react-native';

export default function PaymentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [paymentMethods, setPaymentMethods] = useState([
    {
      id: '1',
      type: 'easypaisa',
      title: 'EasyPaisa',
      details: '+92 300 1234567',
      isDefault: true,
      verified: false,
    },
    {
      id: '2',
      type: 'card',
      title: 'Visa Card',
      details: '**** **** **** 1234',
      expiry: '12/26',
      isDefault: false,
      verified: false,
    },
    {
      id: '3',
      type: 'jazzcash',
      title: 'JazzCash',
      details: '+92 301 9876543',
      isDefault: false,
      verified: false,
    },
  ]);

  const handleEditPayment = (paymentId: string) => {
    Alert.alert('Edit Payment Method', 'Edit payment method functionality would be implemented here.');
  };

  const handleDeletePayment = (paymentId: string) => {
    Alert.alert(
      'Delete Payment Method',
      'Are you sure you want to delete this payment method?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            setPaymentMethods(prev => prev.filter(payment => payment.id !== paymentId));
          }
        }
      ]
    );
  };

  const handleSetDefault = (paymentId: string) => {
    setPaymentMethods(prev => 
      prev.map(payment => ({
        ...payment,
        isDefault: payment.id === paymentId
      }))
    );
  };

  const handleVerifyPayment = (paymentId: string) => {
    Alert.alert('Verify Payment Method', 'Verification process would be implemented here.');
  };

  const handleAddPayment = () => {
    Alert.alert('Add Payment Method', 'Add new payment method functionality would be implemented here.');
  };

  const getPaymentIcon = (type: string) => {
    switch (type) {
      case 'easypaisa':
        return <Smartphone size={20} color="#10B981" />;
      case 'card':
        return <CreditCard size={20} color="#007AFF" />;
      case 'jazzcash':
        return <Smartphone size={20} color="#F59E0B" />;
      default:
        return <CreditCard size={20} color="#6B7280" />;
    }
  };

  const getPaymentIconBg = (type: string) => {
    switch (type) {
      case 'easypaisa':
        return '#F0FDF4';
      case 'card':
        return '#F0F8FF';
      case 'jazzcash':
        return '#FFFBEB';
      default:
        return '#F9FAFB';
    }
  };

  const PaymentCard = ({ payment }: { payment: any }) => (
    <View style={styles.paymentCard}>
      <View style={styles.paymentHeader}>
        <View style={styles.paymentTypeContainer}>
          <View style={[styles.paymentIcon, { backgroundColor: getPaymentIconBg(payment.type) }]}>
            {getPaymentIcon(payment.type)}
          </View>
          <View style={styles.paymentInfo}>
            <View style={styles.paymentTitleRow}>
              <Text style={styles.paymentTitle}>{payment.title}</Text>
              {payment.isDefault && (
                <View style={styles.defaultBadge}>
                  <Star size={12} color="#F59E0B" fill="#F59E0B" />
                  <Text style={styles.defaultText}>Default</Text>
                </View>
              )}
            </View>
            <Text style={styles.paymentDetails}>{payment.details}</Text>
            {payment.expiry && (
              <Text style={styles.paymentExpiry}>Expires: {payment.expiry}</Text>
            )}
          </View>
        </View>
        <View style={styles.paymentActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleEditPayment(payment.id)}
          >
            <Edit3 size={16} color="#6B7280" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeletePayment(payment.id)}
          >
            <Trash2 size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.paymentFooter}>
        {!payment.isDefault && (
          <TouchableOpacity 
            style={styles.setDefaultButton}
            onPress={() => handleSetDefault(payment.id)}
          >
            <Star size={16} color="#6B7280" />
            <Text style={styles.setDefaultText}>Set as Default</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity 
          style={styles.verifyButton}
          onPress={() => handleVerifyPayment(payment.id)}
        >
          <Shield size={16} color="#007AFF" />
          <Text style={styles.verifyText}>Verify</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Methods</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleAddPayment}
        >
          <Plus size={24} color="#007AFF" />
          <Text style={styles.addButtonText}>Add Payment</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Cash on Delivery */}
        <View style={styles.cashCard}>
          <View style={styles.cashIcon}>
            <Banknote size={20} color="#10B981" />
          </View>
          <View style={styles.cashInfo}>
            <Text style={styles.cashTitle}>Cash on Delivery</Text>
            <Text style={styles.cashSubtitle}>Pay when your order arrives</Text>
          </View>
          <View style={styles.availableBadge}>
            <Text style={styles.availableText}>Always Available</Text>
          </View>
        </View>

        {/* Payment Methods */}
        {paymentMethods.map((payment) => (
          <PaymentCard key={payment.id} payment={payment} />
        ))}

        {/* Security Notice */}
        <View style={styles.securityNotice}>
          <Shield size={20} color="#007AFF" />
          <View style={styles.securityContent}>
            <Text style={styles.securityTitle}>Your payments are secure</Text>
            <Text style={styles.securityText}>
              All payment information is encrypted and stored securely. We never store your CVV or PIN.
            </Text>
          </View>
        </View>

        {paymentMethods.length === 0 && (
          <View style={styles.emptyState}>
            <CreditCard size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No Payment Methods</Text>
            <Text style={styles.emptyText}>
              Add your payment methods for faster checkout
            </Text>
            <TouchableOpacity style={styles.emptyAddButton} onPress={handleAddPayment}>
              <Plus size={20} color="#FFFFFF" />
              <Text style={styles.emptyAddButtonText}>Add Payment Method</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  cashCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cashIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cashInfo: {
    flex: 1,
  },
  cashTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 4,
  },
  cashSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  availableBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  availableText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  paymentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  paymentTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  paymentTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginRight: 8,
  },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  defaultText: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    color: '#92400E',
    marginLeft: 4,
  },
  paymentDetails: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 2,
  },
  paymentExpiry: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  paymentActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
  },
  paymentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  setDefaultButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  setDefaultText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginLeft: 4,
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifyText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#007AFF',
    marginLeft: 4,
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  securityContent: {
    flex: 1,
    marginLeft: 12,
  },
  securityTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1E40AF',
    marginBottom: 4,
  },
  securityText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#1E40AF',
    lineHeight: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyAddButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
});