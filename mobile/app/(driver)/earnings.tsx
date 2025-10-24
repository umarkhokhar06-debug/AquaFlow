import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, DollarSign, Calendar, TrendingUp, Package, Filter } from 'lucide-react-native';
import { driverAPI, Earnings, EarningsSummary } from '../../utils/driverAPI';

interface EarningsFilter {
  year?: number;
  month?: number;
}

export default function EarningsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [earnings, setEarnings] = useState<Earnings[]>([]);
  const [summary, setSummary] = useState<EarningsSummary>({
    totalEarnings: 0,
    pendingAmount: 0,
    paidAmount: 0,
    todayEarnings: 0,
    weeklyEarnings: 0,
    monthlyEarnings: 0,
  });
  const [filter, setFilter] = useState<EarningsFilter>({});
  const [showFilter, setShowFilter] = useState(false);

  useEffect(() => {
    loadEarnings();
  }, [filter]);

  const loadEarnings = async () => {
    try {
      setLoading(true);
      const data = await driverAPI.getEarnings(filter);
      // Map backend earnings to frontend type
      const mappedEarnings = (data.earnings || []).map((item: any) => ({
        id: item._id,
        orderId: item.order?._id || '',
        orderNumber: item.orderNumber || item.order?.orderNumber || '',
        amount: item.totalEarned,
        type: "delivery_fee" as "delivery_fee",
        status: item.paymentStatus,
        paymentMethod: item.paymentMethod,
        createdAt: item.createdAt,
        deliveredAt: item.deliveredAt,
        commission: item.commission?.amount || 0,
        baseAmount: item.baseAmount,
        tip: item.tip,
        bonus: item.bonus,
        deductions: item.deductions,
        description: item.description || '',
      }));
      setEarnings(mappedEarnings);

      // Map backend summary to frontend type
  const { totalEarned = 0, totalPending = 0, totalPaid = 0 } = (data.summary as any) || {};
      setSummary({
        totalEarnings: totalEarned,
        pendingAmount: totalPending,
        paidAmount: totalPaid,
        todayEarnings: 0,
        weeklyEarnings: 0,
        monthlyEarnings: 0,
      });
    } catch (error) {
      console.error('Error loading earnings:', error);
      Alert.alert('Error', 'Failed to load earnings data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number | undefined | null) => {
    const safeAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
    return `$${safeAmount.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getEarningTypeColor = (type: string) => {
    switch (type) {
      case 'delivery':
        return '#007AFF';
      case 'bonus':
        return '#34D399';
      case 'tip':
        return '#F59E0B';
      default:
        return '#6B7280';
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'paid' ? '#10B981' : '#F59E0B';
  };

  const renderEarningItem = ({ item, index }: { item: any, index: number }) => (
    <View style={styles.earningItem}>
      <View style={styles.earningHeader}>
        <View style={styles.earningInfo}>
          <Text style={styles.earningType}>
            Delivery #{item.orderNumber}
          </Text>
          <Text style={styles.earningOrder}>Order ID: {item.orderId || 'N/A'}</Text>
          <Text style={styles.earningOrder}>Delivered: {item.deliveredAt ? formatDate(item.deliveredAt) : 'N/A'}</Text>
          {/* <Text style={styles.earningOrder}>Payment: {item.paymentMethod || 'N/A'}</Text> */}
        </View>
        <View style={styles.earningAmount}>
          <Text style={[styles.amount, { color: '#007AFF' }]}> 
            {formatCurrency(item.amount)}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}> 
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
        <Text style={{ marginRight: 12, color: '#6B7280' }}>Base: {formatCurrency(item.baseAmount)}</Text>
        <Text style={{ marginRight: 12, color: '#6B7280' }}>Commission: {formatCurrency(item.commission)}</Text>
        {/* <Text style={{ marginRight: 12, color: '#6B7280' }}>Tip: {formatCurrency(item.tip)}</Text> */}
        {/* <Text style={{ marginRight: 12, color: '#6B7280' }}>Bonus: {formatCurrency(item.bonus)}</Text> */}
        {/* <Text style={{ marginRight: 12, color: '#6B7280' }}>Deductions: {formatCurrency(item.deductions)}</Text> */}
      </View>
      <Text style={styles.earningDate}>Created: {formatDate(item.createdAt)}</Text>
    </View>
  );

  if (loading && earnings.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading earnings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Earnings</Text>
        <TouchableOpacity 
          onPress={() => setShowFilter(!showFilter)} 
          style={styles.filterButton}
        >
          <Filter size={20} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <DollarSign size={24} color="#10B981" />
              <Text style={styles.summaryLabel}>Total Earned</Text>
            </View>
            <Text style={styles.summaryValue}>{formatCurrency(summary.totalEarnings)}</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Package size={24} color="#007AFF" />
              <Text style={styles.summaryLabel}>Monthly Earnings</Text>
            </View>
            <Text style={styles.summaryValue}>{formatCurrency(summary.monthlyEarnings)}</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <TrendingUp size={24} color="#F59E0B" />
              <Text style={styles.summaryLabel}>Weekly Earnings</Text>
            </View>
            <Text style={styles.summaryValue}>{formatCurrency(summary.weeklyEarnings)}</Text>
          </View>
        </View>

        {/* Payment Status */}
        <View style={styles.paymentStatusContainer}>
          <Text style={styles.sectionTitle}>Payment Status</Text>
          <View style={styles.paymentRow}>
            <View style={styles.paymentItem}>
              <Text style={styles.paymentLabel}>Paid</Text>
              <Text style={[styles.paymentValue, { color: '#10B981' }]}> 
                {formatCurrency(summary.paidAmount)}
              </Text>
            </View>
            <View style={styles.paymentItem}>
              <Text style={styles.paymentLabel}>Pending</Text>
              <Text style={[styles.paymentValue, { color: '#F59E0B' }]}> 
                {formatCurrency(summary.pendingAmount)}
              </Text>
            </View>
          </View>
        </View>

        {/* Earnings History */}
        <View style={styles.historyContainer}>
          <Text style={styles.sectionTitle}>Earnings History</Text>
          {earnings.length > 0 ? (
            <FlatList
              data={earnings}
              renderItem={renderEarningItem}
              keyExtractor={(item, index) => item.id ? String(item.id) : (item.orderId ? String(item.orderId) : String(index))}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <DollarSign size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>No earnings data available</Text>
              <Text style={styles.emptySubtext}>
                Complete your first delivery to start earning!
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Filter Modal (simplified) */}
      {showFilter && (
        <View style={styles.filterOverlay}>
          <View style={styles.filterModal}>
            <Text style={styles.filterTitle}>Filter Earnings</Text>
            <TouchableOpacity
              style={styles.filterOption}
              onPress={() => {
                setFilter({});
                setShowFilter(false);
              }}
            >
              <Text style={styles.filterOptionText}>All Time</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.filterOption}
              onPress={() => {
                const currentYear = new Date().getFullYear();
                setFilter({ year: currentYear });
                setShowFilter(false);
              }}
            >
              <Text style={styles.filterOptionText}>This Year</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.filterOption}
              onPress={() => {
                const now = new Date();
                setFilter({ year: now.getFullYear(), month: now.getMonth() + 1 });
                setShowFilter(false);
              }}
            >
              <Text style={styles.filterOptionText}>This Month</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.filterCancel}
              onPress={() => setShowFilter(false)}
            >
              <Text style={styles.filterCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
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
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  filterButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  paymentStatusContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  paymentItem: {
    alignItems: 'center',
  },
  paymentLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  paymentValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  historyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  earningItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingVertical: 16,
  },
  earningHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  earningInfo: {
    flex: 1,
  },
  earningType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  earningOrder: {
    fontSize: 14,
    color: '#6B7280',
  },
  earningAmount: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  earningDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  filterOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    width: '80%',
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  filterOption: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  filterOptionText: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
  },
  filterCancel: {
    paddingVertical: 12,
    marginTop: 8,
  },
  filterCancelText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    fontWeight: '600',
  },
});