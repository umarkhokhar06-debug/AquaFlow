import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Plus,
  CreditCard,
  Banknote,
  Trash2,
  Shield,
} from 'lucide-react-native';
import {
  SavedPaymentMethod,
  PaymentsNotConfiguredError,
  createSetupIntent,
  getSavedPaymentMethods,
  deleteSavedPaymentMethod,
} from '../../utils/paymentAPI';

export default function PaymentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [savedMethods, setSavedMethods] = useState<SavedPaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [addingCard, setAddingCard] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadMethods = useCallback(async () => {
    setLoading(true);
    try {
      const methods = await getSavedPaymentMethods();
      setSavedMethods(methods);
      setConfigured(true);
    } catch (error) {
      if (error instanceof PaymentsNotConfiguredError) {
        setSavedMethods([]);
        setConfigured(false);
      } else {
        Alert.alert('Error', error instanceof Error ? error.message : 'Failed to load payment methods');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadMethods();
    }, [loadMethods])
  );

  const handleDeletePayment = (method: SavedPaymentMethod) => {
    Alert.alert(
      'Remove Card',
      `Remove ${method.brand.toUpperCase()} ending in ${method.last4}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(method.id);
            try {
              await deleteSavedPaymentMethod(method.id);
              setSavedMethods(prev => prev.filter(m => m.id !== method.id));
            } catch (error) {
              Alert.alert('Error', error instanceof Error ? error.message : 'Failed to remove payment method');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const handleAddPayment = async () => {
    setAddingCard(true);
    try {
      await createSetupIntent();
      Alert.alert(
        'Almost there',
        'Card setup is ready on our end, but in-app card entry is coming in a future update. Cash on Delivery is available meanwhile.'
      );
    } catch (error) {
      if (error instanceof PaymentsNotConfiguredError) {
        Alert.alert('Not Available Yet', 'Online card payments aren’t enabled yet. Cash on Delivery is available meanwhile.');
      } else {
        Alert.alert('Error', error instanceof Error ? error.message : 'Failed to start card setup');
      }
    } finally {
      setAddingCard(false);
    }
  };

  const CardMethodRow = ({ method }: { method: SavedPaymentMethod }) => (
    <View style={styles.paymentCard}>
      <View style={styles.paymentHeader}>
        <View style={styles.paymentTypeContainer}>
          <View style={[styles.paymentIcon, { backgroundColor: '#F0F8FF' }]}>
            <CreditCard size={20} color="#087EA4" />
          </View>
          <View style={styles.paymentInfo}>
            <Text style={styles.paymentTitle}>{method.brand.charAt(0).toUpperCase() + method.brand.slice(1)} Card</Text>
            <Text style={styles.paymentDetails}>**** **** **** {method.last4}</Text>
            <Text style={styles.paymentExpiry}>Expires {String(method.expMonth).padStart(2, '0')}/{String(method.expYear).slice(-2)}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeletePayment(method)}
          disabled={deletingId === method.id}
        >
          {deletingId === method.id ? (
            <ActivityIndicator size="small" color="#EF4444" />
          ) : (
            <Trash2 size={16} color="#EF4444" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Methods</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddPayment} disabled={addingCard}>
          {addingCard ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Plus size={24} color="#087EA4" />
              <Text style={styles.addButtonText}>Add Card</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
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

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#087EA4" />
          </View>
        ) : (
          <>
            {savedMethods.map(method => (
              <CardMethodRow key={method.id} method={method} />
            ))}

            {!configured && (
              <View style={styles.securityNotice}>
                <Shield size={20} color="#087EA4" />
                <View style={styles.securityContent}>
                  <Text style={styles.securityTitle}>Online card payments coming soon</Text>
                  <Text style={styles.securityText}>
                    We're finishing setup for online card payments. Cash on Delivery works for every order in the meantime.
                  </Text>
                </View>
              </View>
            )}

            {configured && savedMethods.length === 0 && (
              <View style={styles.emptyState}>
                <CreditCard size={48} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>No Saved Cards</Text>
                <Text style={styles.emptyText}>Add a card for faster checkout next time</Text>
                <TouchableOpacity style={styles.emptyAddButton} onPress={handleAddPayment} disabled={addingCard}>
                  <Plus size={20} color="#FFFFFF" />
                  <Text style={styles.emptyAddButtonText}>Add Payment Method</Text>
                </TouchableOpacity>
              </View>
            )}

            {configured && savedMethods.length > 0 && (
              <View style={styles.securityNotice}>
                <Shield size={20} color="#087EA4" />
                <View style={styles.securityContent}>
                  <Text style={styles.securityTitle}>Your payments are secure</Text>
                  <Text style={styles.securityText}>
                    All payment information is encrypted and stored securely. We never store your CVV or PIN.
                  </Text>
                </View>
              </View>
            )}
          </>
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
    fontFamily: 'Sora-SemiBold',
    color: '#1F2937',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#087EA4',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 44,
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 14,
    fontFamily: 'Sora-SemiBold',
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
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
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
    fontFamily: 'Sora-SemiBold',
    color: '#1F2937',
    marginBottom: 4,
  },
  cashSubtitle: {
    fontSize: 14,
    fontFamily: 'Sora-Regular',
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
    fontFamily: 'Sora-SemiBold',
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
  paymentTitle: {
    fontSize: 16,
    fontFamily: 'Sora-SemiBold',
    color: '#1F2937',
    marginBottom: 4,
  },
  paymentDetails: {
    fontSize: 14,
    fontFamily: 'Sora-Regular',
    color: '#6B7280',
    marginBottom: 2,
  },
  paymentExpiry: {
    fontSize: 12,
    fontFamily: 'Sora-Regular',
    color: '#9CA3AF',
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
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#087EA4',
  },
  securityContent: {
    flex: 1,
    marginLeft: 12,
  },
  securityTitle: {
    fontSize: 14,
    fontFamily: 'Sora-SemiBold',
    color: '#1E40AF',
    marginBottom: 4,
  },
  securityText: {
    fontSize: 12,
    fontFamily: 'Sora-Regular',
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
    fontFamily: 'Sora-SemiBold',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Sora-Regular',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#087EA4',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyAddButtonText: {
    fontSize: 14,
    fontFamily: 'Sora-SemiBold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
});
