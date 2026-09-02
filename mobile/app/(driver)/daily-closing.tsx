import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, DollarSign, CheckCircle } from 'lucide-react-native';
import { submitDailyClosing, getMyDailyClosings, DailyClosing } from '../../utils/dailyClosingAPI';

export default function DailyClosingScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<DailyClosing[]>([]);

  const [cashCollected, setCashCollected] = useState('');
  const [onlineCollected, setOnlineCollected] = useState('');
  const [paymentProofUrl, setPaymentProofUrl] = useState('');
  const [notes, setNotes] = useState('');

  const loadHistory = async () => {
    try {
      const data = await getMyDailyClosings();
      setHistory(data);
    } catch (error) {
      console.error('Error loading daily closings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadHistory(); }, []);

  const todayAlreadySubmitted = history.some(
    (c) => new Date(c.date).toDateString() === new Date().toDateString()
  );

  const handleSubmit = async () => {
    if (!cashCollected) {
      Alert.alert('Cash amount required', 'Enter how much cash you collected today.');
      return;
    }
    setSubmitting(true);
    try {
      await submitDailyClosing({
        cashCollected: Number(cashCollected),
        onlineCollected: onlineCollected ? Number(onlineCollected) : 0,
        paymentProofUrl: paymentProofUrl.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setCashCollected('');
      setOnlineCollected('');
      setPaymentProofUrl('');
      setNotes('');
      Alert.alert('Submitted', "Today's closing has been submitted for reconciliation.");
      loadHistory();
    } catch (error) {
      Alert.alert('Could not submit', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#087EA4" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#087EA4" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daily Closing</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {todayAlreadySubmitted ? (
          <View style={styles.doneCard}>
            <CheckCircle size={22} color="#28A745" />
            <Text style={styles.doneText}>You've already submitted today's closing.</Text>
          </View>
        ) : (
          <View style={styles.formCard}>
            <Text style={styles.label}>Cash collected (Rs)</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              keyboardType="number-pad"
              value={cashCollected}
              onChangeText={setCashCollected}
            />

            <Text style={styles.label}>Online payments collected (Rs)</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              keyboardType="number-pad"
              value={onlineCollected}
              onChangeText={setOnlineCollected}
            />

            <Text style={styles.label}>Payment proof link (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Link to a screenshot, if you have one"
              autoCapitalize="none"
              value={paymentProofUrl}
              onChangeText={setPaymentProofUrl}
            />

            <Text style={styles.label}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Anything the office should know"
              multiline
              value={notes}
              onChangeText={setNotes}
            />

            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={submitting}>
              <Text style={styles.submitButtonText}>{submitting ? 'Submitting...' : 'Submit Closing'}</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.historyLabel}>Recent closings</Text>
        {history.length === 0 ? (
          <Text style={styles.emptyText}>No closings submitted yet.</Text>
        ) : (
          history.map((c) => (
            <View key={c._id} style={styles.historyCard}>
              <View style={styles.historyRow}>
                <DollarSign size={16} color="#087EA4" />
                <Text style={styles.historyDate}>{new Date(c.date).toLocaleDateString()}</Text>
                <View style={[styles.statusBadge, c.status === 'reconciled' ? styles.statusReconciled : styles.statusSubmitted]}>
                  <Text style={styles.statusBadgeText}>{c.status}</Text>
                </View>
              </View>
              <Text style={styles.historyAmount}>Cash Rs. {c.cashCollected} &middot; Online Rs. {c.onlineCollected}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  content: { flex: 1, padding: 20 },
  doneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  doneText: { flex: 1, fontSize: 13, color: '#166534' },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  label: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1F2937',
  },
  inputMultiline: { minHeight: 70, textAlignVertical: 'top' },
  submitButton: {
    backgroundColor: '#087EA4',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  historyLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 10 },
  emptyText: { fontSize: 13, color: '#9CA3AF', marginBottom: 20 },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  historyDate: { flex: 1, fontSize: 13, fontWeight: '500', color: '#1F2937' },
  historyAmount: { fontSize: 12, color: '#6B7280', marginTop: 6 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
  statusSubmitted: { backgroundColor: '#FEF3C7' },
  statusReconciled: { backgroundColor: '#D1FAE5' },
  statusBadgeText: { fontSize: 11, fontWeight: '500', color: '#374151' },
});
